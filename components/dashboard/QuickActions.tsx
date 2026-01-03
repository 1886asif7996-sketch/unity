import { Bell, FileText, Wallet } from "lucide-react";

export default function QuickActions() {
    const actions = [
        { label: "Notice", icon: Bell, color: "bg-purple-200", iconColor: "text-purple-900" },
        { label: "Rules", icon: FileText, color: "bg-green-200", iconColor: "text-green-900" },
        { label: "Fine", icon: Wallet, color: "bg-blue-200", iconColor: "text-blue-900" },
    ];

    return (
        <div className="flex gap-6 my-8">
            {actions.map((action) => (
                <button key={action.label} className="flex flex-col items-center gap-2 group">
                    <div className={`${action.color} w-16 h-16 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-105 active:scale-95`}>
                        <action.icon className={action.iconColor} size={28} />
                    </div>
                    <span className="text-gray-400 text-sm font-medium">{action.label}</span>
                </button>
            ))}
        </div>
    );
}
