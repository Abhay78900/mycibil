// Page URL mapping for navigation
const PAGE_ROUTES: Record<string, string> = {
  Dashboard: '/dashboard',
  AdminReportsRepository: '/admin/reports',
  PartnerReports: '/partner/reports',
  SelectReports: '/check-score',
  CheckScore: '/check-score',
  UnlockReport: '/payment',
  CreditReport: '/credit-report',
};

export function createPageUrl(pageName: string): string {
  return PAGE_ROUTES[pageName] || '/dashboard';
}
