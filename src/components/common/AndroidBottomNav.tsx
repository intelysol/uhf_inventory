import React from 'react';
import { Home, ClipboardList, Search, Boxes, Menu } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { ScreenType } from '../../types/rfid';

export const AndroidBottomNav: React.FC = () => {
  const { currentScreen, navigateTo, isScanning } = useRFID();

  const navItems: Array<{
    id: string;
    label: string;
    targetScreen: ScreenType;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    badge?: number;
  }> = [
    {
      id: 'home',
      label: 'Home',
      targetScreen: 'dashboard',
      icon: Home,
      isActive: currentScreen === 'dashboard' || currentScreen === 'splash'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      targetScreen: 'start_inventory',
      icon: ClipboardList,
      isActive: ['start_inventory', 'live_inventory', 'inventory_results', 'inventory_history', 'session_details'].includes(currentScreen)
    },
    {
      id: 'find',
      label: 'Find',
      targetScreen: 'find_search',
      icon: Search,
      isActive: ['find_search', 'find_radar'].includes(currentScreen)
    },
    {
      id: 'products',
      label: 'Products',
      targetScreen: 'products',
      icon: Boxes,
      isActive: ['products', 'product_details', 'add_edit_product'].includes(currentScreen)
    },
    {
      id: 'more',
      label: 'More',
      targetScreen: 'reader_settings',
      icon: Menu,
      isActive: ['reader_settings', 'app_settings', 'import_data', 'export_data', 'empty_states_demo', 'reader_connection'].includes(currentScreen)
    }
  ];

  return (
    <nav className="w-full bg-white border-t border-slate-200 px-2 py-1 flex items-center justify-around select-none shrink-0 shadow-lg z-20">
      {navItems.map(item => {
        const Icon = item.icon;
        const active = item.isActive;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            onClick={() => navigateTo(item.targetScreen)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative min-w-[58px] ${
              active
                ? 'text-[#3f51b5] font-black'
                : 'text-slate-400 font-bold hover:text-slate-600'
            }`}
          >
            {/* Active pill background */}
            <div
              className={`flex items-center justify-center p-1.5 rounded-xl transition-colors ${
                active ? 'bg-indigo-50 text-[#3f51b5]' : 'bg-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
            </div>

            <span className={`text-[10px] mt-0.5 uppercase tracking-wide ${active ? 'font-black text-[#3f51b5]' : 'font-bold text-slate-400'}`}>
              {item.label}
            </span>

            {/* If scanning, pulse indicator on Inventory tab */}
            {isScanning && item.id === 'inventory' && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
