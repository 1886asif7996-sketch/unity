"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import { Users, DollarSign, FileText, Bell, Search, PlusCircle, Trash2, Calendar, CheckCircle, Download } from "lucide-react";
// Ensure these are installed: npm install jspdf jspdf-autotable
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    const [members, setMembers] = useState<any[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Transaction Form
    const [selectedUser, setSelectedUser] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));

    // Expenses Form
    const [expAmount, setExpAmount] = useState("");
    const [expDesc, setExpDesc] = useState("");

    // Fines Form
    const [fineUser, setFineUser] = useState("");
    const [fineAmount, setFineAmount] = useState("");
    const [fineDesc, setFineDesc] = useState("");
    const [fineDate, setFineDate] = useState(new Date());
    const [activeFines, setActiveFines] = useState<any[]>([]);

    // Settings
    const [notice, setNotice] = useState("");
    const [rules, setRules] = useState("");

    // Report State
    const [reportDate, setReportDate] = useState(new Date());

    useEffect(() => { checkAdmin(); }, []);

    const checkAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data?.role !== 'admin') { router.push('/'); return; }

        fetchData();
        setLoading(false);
    };

    const fetchData = async () => {
        const { data: usrs } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (usrs) { setMembers(usrs); setFilteredMembers(usrs); }

        const { data: settings } = await supabase.from('settings').select('*');
        if (settings) {
            const n = settings.find((s: any) => s.key_name === 'notice');
            const r = settings.find((s: any) => s.key_name === 'rules');
            if (n) setNotice(n.value);
            if (r) setRules(r.value);
        }

        fetchActiveFines();
    };

    const fetchActiveFines = async () => {
        const { data } = await supabase.from('fines').select('*, profiles(full_name)').eq('status', 'unpaid').order('created_at', { ascending: false });
        if (data) setActiveFines(data);
    };

    useEffect(() => {
        if (!searchTerm) setFilteredMembers(members);
        else setFilteredMembers(members.filter(m => m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || m.email?.toLowerCase().includes(searchTerm.toLowerCase())));
    }, [searchTerm, members]);

    // --- ACTIONS ---

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !amount || !description || !txDate) return toast.error("Fill all fields");
        const { error } = await supabase.from('transactions').insert({
            user_id: selectedUser,
            amount: parseFloat(amount),
            description: description,
            type: 'deposit',
            created_at: new Date(txDate).toISOString(),
            approved: true
        });
        if (error) toast.error(error.message);
        else { toast.success("Transaction Saved"); setAmount(""); setDescription(""); }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expAmount || !expDesc) return toast.error("Fill fields");
        const { error } = await supabase.from('society_expenses').insert({
            amount: parseFloat(expAmount),
            description: expDesc
        });
        if (error) toast.error(error.message); else { toast.success("Expense Recorded"); setExpAmount(""); setExpDesc(""); }
    };

    const handleAssignFine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fineUser || !fineAmount || !fineDesc) return toast.error("Fill fine details");
        const month = fineDate.getMonth() + 1;
        const year = fineDate.getFullYear();
        const { error } = await supabase.from('fines').insert({
            user_id: fineUser,
            amount: parseFloat(fineAmount),
            description: fineDesc,
            month: month,
            year: year,
            status: 'unpaid'
        });
        if (error) toast.error(error.message); else { toast.success("Fine Assigned"); setFineAmount(""); setFineDesc(""); fetchActiveFines(); }
    };

    const markFinePaid = async (fineId: string) => {
        const { error } = await supabase.from('fines').update({ status: 'paid' }).eq('id', fineId);
        if (error) toast.error(error.message); else { toast.success("Marked Paid"); fetchActiveFines(); }
    };

    const updateSetting = async (key: string, val: string) => {
        const { error } = await supabase.from('settings').upsert(
            { key_name: key, value: val },
            { onConflict: 'key_name' }
        );

        if (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } else {
            toast.success(key.charAt(0).toUpperCase() + key.slice(1) + " Updated!");
        }
    };

    // --- PDF REPORT GENERATION ---
    const handleDownloadReport = async () => {
        const loadingToast = toast.loading("Generating Report...");

        try {
            const month = reportDate.getMonth() + 1;
            const year = reportDate.getFullYear();
            const startOfMonth = new Date(year, month - 1, 1).toISOString();
            const endOfMonth = new Date(year, month, 0).toISOString();

            // 1. Fetch Transactions (Deposits)
            const { data: deposits, error: txError } = await supabase
                .from('transactions')
                .select('amount, description, created_at, user_id')
                .gte('created_at', startOfMonth)
                .lte('created_at', endOfMonth)
                .eq('approved', true);

            if (txError) throw txError;

            // 2. Fetch Fines (Paid & Unpaid) for that month
            const { data: fines, error: fineError } = await supabase
                .from('fines')
                .select('amount, description, created_at, user_id, status')
                .eq('month', month)
                .eq('year', year);

            if (fineError) throw fineError;

            // 3. Prepare Data Rows with Names
            const rows: any[] = [];
            let totalCollection = 0;
            let totalFinesIssued = 0;

            const getName = (uid: string) => {
                const u = members.find(m => m.id === uid);
                return u?.full_name || u?.email || 'Unknown Member';
            };

            deposits?.forEach(d => {
                rows.push([
                    new Date(d.created_at).toLocaleDateString(),
                    getName(d.user_id),
                    'Deposit',
                    d.description,
                    `${d.amount} TK`
                ]);
                totalCollection += Number(d.amount);
            });

            fines?.forEach(f => {
                rows.push([
                    new Date(f.created_at).toLocaleDateString(),
                    getName(f.user_id),
                    `Fine (${f.status})`,
                    f.description,
                    `${f.amount} TK`
                ]);
                totalFinesIssued += Number(f.amount);
            });

            // Sort by date
            rows.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

            // 4. Generate PDF
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.setTextColor(40, 40, 40);
            doc.text("Unity2020 - Monthly Report", 14, 22);

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text(`Period: ${reportDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 14, 30);

            // Table
            autoTable(doc, {
                startY: 35,
                head: [['Date', 'Member Name', 'Type', 'Description', 'Amount']],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [22, 163, 74] }, // Green header
                styles: { fontSize: 9 },
            });

            // Summary
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("Summary:", 14, finalY);

            doc.setFontSize(10);
            doc.text(`Total Monthly Collection (Deposits): ${totalCollection} TK`, 14, finalY + 6);

            doc.save(`Unity2020_Report_${month}_${year}.pdf`);

            toast.dismiss(loadingToast);
            toast.success("Report Downloaded!");

        } catch (err: any) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error("Failed: " + err.message);
        }
    };

    if (loading) return <div className="text-white p-10">Loading...</div>;

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
            <Toaster />
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-center border-b border-white/10 pb-6">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <button onClick={() => router.push('/')} className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20">Exit</button>
                </header>

                {/* REPORT SECTION */}
                <div className="bg-[#111] p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-400" /> Monthly Report</h3>
                        <p className="text-gray-500 text-sm">Download stats for the selected period.</p>
                    </div>
                    <div className="flex gap-4 items-center bg-black p-2 rounded-xl border border-white/10">
                        <input type="month" value={reportDate.toISOString().slice(0, 7)} onChange={e => setReportDate(new Date(e.target.value))} className="bg-transparent text-white outline-none p-2 rounded-lg" />
                        <button onClick={handleDownloadReport} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                            <Download size={18} /> Download PDF
                        </button>
                    </div>
                </div>

                {/* TRANSACTION & EXPENSE ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[#111] p-6 rounded-3xl border border-white/10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><DollarSign className="text-green-500" /> Add Transaction</h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="flex gap-4">
                                <select className="flex-1 bg-black border border-white/20 rounded-xl p-3 outline-none focus:border-green-500" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                                    <option value="">Select Member</option>
                                    {members.filter(m => m.status === 'active').map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                                </select>
                                <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-1/3 bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-green-500 text-gray-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-green-500" />
                                <input type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-green-500" />
                            </div>
                            <button type="submit" className="w-full bg-green-600 font-bold py-3 rounded-xl hover:bg-green-500">Save Transaction</button>
                        </form>
                    </div>

                    <div className="bg-[#111] p-6 rounded-3xl border border-white/10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Trash2 className="text-red-500" /> Society Expense</h3>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <input type="number" placeholder="Amount (TK)" value={expAmount} onChange={e => setExpAmount(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-red-500" />
                            <input type="text" placeholder="Reason (e.g. Server)" value={expDesc} onChange={e => setExpDesc(e.target.value)} className="w-full bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-red-500" />
                            <button type="submit" className="w-full bg-red-600/20 border border-red-600 text-red-500 font-bold py-3 rounded-xl hover:bg-red-600 hover:text-white">Record Expense</button>
                        </form>
                    </div>
                </div>

                {/* FINE MANAGEMENT ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[#111] p-6 rounded-3xl border border-white/10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><PlusCircle className="text-orange-500" /> Assign Fine</h3>
                        <form onSubmit={handleAssignFine} className="space-y-4">
                            <div className="flex gap-4">
                                <select className="flex-1 bg-black border border-white/20 rounded-xl p-3 outline-none focus:border-orange-500" value={fineUser} onChange={e => setFineUser(e.target.value)}>
                                    <option value="">Select Member</option>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                                </select>
                                <input type="month" value={fineDate.toISOString().slice(0, 7)} onChange={e => setFineDate(new Date(e.target.value))} className="w-1/3 bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-orange-500 text-gray-400" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Fine Amount" value={fineAmount} onChange={e => setFineAmount(e.target.value)} className="bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-orange-500" />
                                <input type="text" placeholder="Reason" value={fineDesc} onChange={e => setFineDesc(e.target.value)} className="bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-orange-500" />
                            </div>
                            <button type="submit" className="w-full bg-orange-600 font-bold py-3 rounded-xl hover:bg-orange-500">Assign Fine</button>
                        </form>
                    </div>

                    <div className="bg-[#111] p-6 rounded-3xl border border-white/10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><CheckCircle className="text-blue-500" /> Active Fines</h3>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {activeFines.length === 0 && <p className="text-gray-500 text-sm">No unpaid fines.</p>}
                            {activeFines.map(f => (
                                <div key={f.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div>
                                        <p className="font-bold text-sm">{f.profiles?.full_name}</p>
                                        <p className="text-xs text-gray-400">{f.description} ({f.month}/{f.year})</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-red-500 font-bold">{f.amount} TK</span>
                                        <button onClick={() => markFinePaid(f.id)} className="bg-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-500">Mark Paid</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SETTINGS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-[#111] p-6 rounded-3xl border border-white/10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Bell className="text-purple-500" /> Notice Board</h3>
                        <textarea className="w-full h-24 bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-purple-500 resize-none mb-3" value={notice} onChange={e => setNotice(e.target.value)} />
                        <button onClick={() => updateSetting('notice', notice)} className="w-full bg-purple-600/20 text-purple-500 border border-purple-600 py-2 rounded-xl font-bold hover:bg-purple-600 hover:text-white">Save Notice</button>
                    </div>
                    <div className="bg-[#111] p-6 rounded-3xl border border-white/10">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><FileText className="text-blue-500" /> Group Rules</h3>
                        <textarea className="w-full h-24 bg-black border border-white/20 p-3 rounded-xl outline-none focus:border-blue-500 resize-none mb-3" value={rules} onChange={e => setRules(e.target.value)} />
                        <button onClick={() => updateSetting('rules', rules)} className="w-full bg-blue-600/20 text-blue-500 border border-blue-600 py-2 rounded-xl font-bold hover:bg-blue-600 hover:text-white">Save Rules</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
