import { Home, Users, Bell, FileText, Settings, LogOut } from "lucide-react";

const navItems = [
    { icon: Home, label: "Home", active: true },
    { icon: Users, label: "Members", active: false },
    { icon: Bell, label: "Notices", active: false },
    { icon: FileText, label: "Rules", active: false },
    { icon: Settings, label: "Settings", active: false },
];

export default function Sidebar() {
    return (
        <aside className="hidden lg:flex w-72 h-screen flex-col border-r border-white/10 p-6 fixed left-0 top-0 bg-black z-50">
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-white">
                    Unity<span className="text-success">2020</span>
                </h1>
            </div>

            <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${item.active
                                ? "bg-success text-black font-semibold"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        <item.icon size={22} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <button className="flex items-center gap-3 px-4 py-3 text-error hover:bg-white/5 rounded-xl transition-all w-full mt-auto">
                <LogOut size={22} />
                Logout
            </button>
        </aside>
    );
}
