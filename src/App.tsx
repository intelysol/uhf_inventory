import React from 'react';
import { RFIDProvider, useRFID } from './context/RFIDContext';
import { AndroidStatusBar } from './components/common/AndroidStatusBar';
import { AndroidBottomNav } from './components/common/AndroidBottomNav';
import { HardwareTriggerFab } from './components/common/HardwareTriggerFab';
import { UnknownTagModal } from './components/common/UnknownTagModal';

import { SplashScreen } from './components/screens/SplashScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';
import { ReaderConnectionScreen } from './components/screens/ReaderConnectionScreen';
import { StartInventoryScreen } from './components/screens/StartInventoryScreen';
import { LiveInventoryScreen } from './components/screens/LiveInventoryScreen';
import { InventoryResultsScreen } from './components/screens/InventoryResultsScreen';
import { ProductFinderSearchScreen } from './components/screens/ProductFinderSearchScreen';
import { RFIDRadarFinderScreen } from './components/screens/RFIDRadarFinderScreen';
import { QuickScanScreen } from './components/screens/QuickScanScreen';
import { ProductsScreen } from './components/screens/ProductsScreen';
import { ProductDetailsScreen } from './components/screens/ProductDetailsScreen';
import { AddEditProductScreen } from './components/screens/AddEditProductScreen';
import { InventoryHistoryScreen } from './components/screens/InventoryHistoryScreen';
import { InventorySessionDetailsScreen } from './components/screens/InventorySessionDetailsScreen';
import { ImportDataScreen } from './components/screens/ImportDataScreen';
import { ExportDataScreen } from './components/screens/ExportDataScreen';
import { AppSettingsScreen } from './components/screens/AppSettingsScreen';
import { ScannerTestScreen } from './components/screens/ScannerTestScreen';

const MainScreenRouter: React.FC = () => {
  const { currentScreen } = useRFID();

  // Screens where Bottom Navigation should be hidden for focused full-screen warehouse work
  const hideBottomNavScreens = [
    'splash',
    'live_inventory',
    'find_radar'
  ];

  const showBottomNav = !hideBottomNavScreens.includes(currentScreen);

  // Render current screen component
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'reader_connection':
        return <ReaderConnectionScreen />;
      case 'start_inventory':
        return <StartInventoryScreen />;
      case 'live_inventory':
        return <LiveInventoryScreen />;
      case 'inventory_results':
        return <InventoryResultsScreen />;
      case 'find_search':
        return <ProductFinderSearchScreen />;
      case 'find_radar':
        return <RFIDRadarFinderScreen />;
      case 'quick_scan':
        return <QuickScanScreen />;
      case 'products':
        return <ProductsScreen />;
      case 'product_details':
        return <ProductDetailsScreen />;
      case 'add_edit_product':
        return <AddEditProductScreen />;
      case 'inventory_history':
        return <InventoryHistoryScreen />;
      case 'session_details':
        return <InventorySessionDetailsScreen />;
      case 'import_data':
        return <ImportDataScreen />;
      case 'export_data':
        return <ExportDataScreen />;
      case 'settings':
        return <AppSettingsScreen />;
      case 'scanner_test':
        return <ScannerTestScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex items-center justify-center p-0 sm:p-4 md:p-6 select-none">
      {/* Mobile Frame Container: 430px max width for Android Flagship layout */}
      <div className="relative w-full max-w-[430px] h-full sm:h-[880px] sm:max-h-[95vh] bg-white sm:rounded-[40px] shadow-2xl sm:ring-12 sm:ring-slate-800 flex flex-col overflow-hidden">
        {/* Android Status Bar */}
        <AndroidStatusBar />

        {/* Active Screen View */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col">
          {renderCurrentScreen()}
        </div>

        {/* Global Hardware Trigger Button Simulator (Floating) */}
        <HardwareTriggerFab />

        {/* Real-time Unknown Tag Detection Bottom Sheet Modal */}
        <UnknownTagModal />

        {/* Android Navigation Bar */}
        {showBottomNav && <AndroidBottomNav />}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <RFIDProvider>
      <MainScreenRouter />
    </RFIDProvider>
  );
}
