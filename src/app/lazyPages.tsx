import { lazy } from 'react'

/** 路由級 code-splitting；與 `App.tsx` 路徑一一對應 */
export const LazyDashboardPage = lazy(() =>
  import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
export const LazyGroupsPage = lazy(() =>
  import('../modules/groupbuy/V50GroupOpsPage').then((m) => ({ default: m.V50GroupOpsPage })),
)
export const LazyGroupDetailPage = lazy(() =>
  import('../pages/GroupDetailPage').then((m) => ({ default: m.GroupDetailPage })),
)
export const LazyProductsPage = lazy(() => import('../pages/ProductsPage').then((m) => ({ default: m.ProductsPage })))
export const LazySpotShopPage = lazy(() => import('../pages/SpotShopPage').then((m) => ({ default: m.SpotShopPage })))
export const LazyOrdersPage = lazy(() => import('../pages/OrdersPage').then((m) => ({ default: m.OrdersPage })))
export const LazyOrderDetailPage = lazy(() =>
  import('../pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
)
export const LazyCustomersPage = lazy(() =>
  import('../pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
export const LazyCustomerDetailPage = lazy(() =>
  import('../pages/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })),
)
export const LazyShippingPage = lazy(() => import('../pages/ShippingPage').then((m) => ({ default: m.ShippingPage })))
export const LazyLiveManagePage = lazy(() =>
  import('../pages/LiveManagePage').then((m) => ({ default: m.LiveManagePage })),
)
export const LazyShipmentRecordsPage = lazy(() =>
  import('../pages/ShipmentRecordsPage').then((m) => ({ default: m.ShipmentRecordsPage })),
)
export const LazyMyShipRecordsPage = lazy(() =>
  import('../pages/MyShipRecordsPage').then((m) => ({ default: m.MyShipRecordsPage })),
)
export const LazyPortalPreviewPage = lazy(() =>
  import('../pages/PortalPreviewPage').then((m) => ({ default: m.PortalPreviewPage })),
)
export const LazyPortalContentAdminPage = lazy(() =>
  import('../pages/PortalContentAdminPage').then((m) => ({ default: m.PortalContentAdminPage })),
)
export const LazyBankViewerAdminPage = lazy(() =>
  import('../pages/BankViewerAdminPage').then((m) => ({ default: m.BankViewerAdminPage })),
)
export const LazyBankAccountViewerPage = lazy(() =>
  import('../pages/BankAccountViewerPage').then((m) => ({ default: m.BankAccountViewerPage })),
)
export const LazySettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
export const LazyCustomerPortalPage = lazy(() =>
  import('../pages/CustomerPortalPage').then((m) => ({ default: m.CustomerPortalPage })),
)
export const LazyCustomerLookupPage = lazy(() =>
  import('../pages/CustomerLookupPage').then((m) => ({ default: m.CustomerLookupPage })),
)
export const LazyOpenGroupsPage = lazy(() =>
  import('../pages/open-groups/OpenGroupsPage').then((m) => ({ default: m.OpenGroupsPage })),
)
export const LazyOpenGroupDetailPage = lazy(() =>
  import('../pages/open-groups/OpenGroupDetailPage').then((m) => ({ default: m.OpenGroupDetailPage })),
)
export const LazyAdminOpenGroupsPreviewPage = lazy(() =>
  import('../pages/AdminOpenGroupsPreviewPage').then((m) => ({ default: m.AdminOpenGroupsPreviewPage })),
)
export const LazyTutorialPage = lazy(() => import('../pages/TutorialPage').then((m) => ({ default: m.TutorialPage })))
export const LazyGroupRulesPage = lazy(() =>
  import('../pages/GroupRulesPage').then((m) => ({ default: m.GroupRulesPage })),
)
export const LazyMessageTemplatesPage = lazy(() =>
  import('../pages/MessageTemplatesPage').then((m) => ({ default: m.MessageTemplatesPage })),
)
export const LazyIntegrationsPage = lazy(() =>
  import('../pages/IntegrationsPage').then((m) => ({ default: m.IntegrationsPage })),
)
export const LazyProcurementDashboardPage = lazy(() =>
  import('../pages/ProcurementDashboardPage').then((m) => ({ default: m.ProcurementDashboardPage })),
)
export const LazySuppliersPage = lazy(() =>
  import('../pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
)
export const LazyPurchaseOrdersPage = lazy(() =>
  import('../pages/PurchaseOrdersPage').then((m) => ({ default: m.PurchaseOrdersPage })),
)
export const LazyPurchaseOrderDetailPage = lazy(() =>
  import('../pages/PurchaseOrderDetailPage').then((m) => ({ default: m.PurchaseOrderDetailPage })),
)
export const LazyReceiptsPage = lazy(() => import('../pages/ReceiptsPage').then((m) => ({ default: m.ReceiptsPage })))
export const LazyPayablesPage = lazy(() => import('../pages/PayablesPage').then((m) => ({ default: m.PayablesPage })))
export const LazyPurchaseReturnsPage = lazy(() =>
  import('../pages/PurchaseReturnsPage').then((m) => ({ default: m.PurchaseReturnsPage })),
)
export const LazyProcurementReconciliationPage = lazy(() =>
  import('../pages/ProcurementReconciliationPage').then((m) => ({ default: m.ProcurementReconciliationPage })),
)
export const LazyGroupBuyPage = lazy(() =>
  import('../modules/groupbuy/GroupBuyPage').then((m) => ({ default: m.GroupBuyPage })),
)
export const LazyPreorderPage = lazy(() =>
  import('../modules/preorder/PreorderPage').then((m) => ({ default: m.PreorderPage })),
)
export const LazyGroupBuyPreorderHubPage = lazy(() =>
  import('../pages/GroupBuyPreorderHubPage').then((m) => ({ default: m.GroupBuyPreorderHubPage })),
)
export const LazyAdminLoginPage = lazy(() =>
  import('../pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })),
)
export const LazyAdminNicknameSearchPage = lazy(() =>
  import('../pages/AdminNicknameSearchPage').then((m) => ({ default: m.AdminNicknameSearchPage })),
)
export const LazyAdminCustomerPreviewPage = lazy(() =>
  import('../pages/AdminCustomerPreviewPage').then((m) => ({ default: m.AdminCustomerPreviewPage })),
)
export const LazyPaymentReviewPage = lazy(() =>
  import('../pages/PaymentReviewPage').then((m) => ({ default: m.PaymentReviewPage })),
)
export const LazyPaymentReportPage = lazy(() =>
  import('../pages/PaymentReportPage').then((m) => ({ default: m.PaymentReportPage })),
)
export const LazyPublicShell = lazy(() =>
  import('../pages/storefront/PublicShell').then((m) => ({ default: m.PublicShell })),
)
export const LazyPublicHomePage = lazy(() =>
  import('../pages/storefront/PublicHomePage').then((m) => ({ default: m.PublicHomePage })),
)
export const LazyPublicShopPage = lazy(() =>
  import('../pages/storefront/PublicShopPage').then((m) => ({ default: m.PublicShopPage })),
)
export const LazyPublicProductPage = lazy(() =>
  import('../pages/storefront/PublicProductPage').then((m) => ({ default: m.PublicProductPage })),
)
export const LazyPublicCartPage = lazy(() =>
  import('../pages/storefront/PublicCartPage').then((m) => ({ default: m.PublicCartPage })),
)
export const LazyPublicCheckoutPage = lazy(() =>
  import('../pages/storefront/PublicCheckoutPage').then((m) => ({ default: m.PublicCheckoutPage })),
)
