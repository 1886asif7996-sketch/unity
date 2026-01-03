import { Home, Users, Grid, Settings } from "lucide-react";

const navItems = [
    { icon: Home, label: "Home", active: true },
    { icon: Users, label: "Members", active: false },
    { icon: Grid, label: "Menu", active: false },
    { icon: Settings, label: "Settings", active: false },
];

export default function BottomNav() {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 lg:hidden z-50">
            <div className="flex justify-around items-center">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={`flex flex-col items-center gap-1 transition-colors ${item.active ? "text-success" : "text-gray-500"
                            }`}
                    >
                        <item.icon size={24} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
