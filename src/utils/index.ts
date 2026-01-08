// Page URL mapping for navigation
const PAGE_ROUTES: Record<string, string> = {
  Dashboard: '/dashboard',
  AdminReportsRepository: '/admin/reports',
  PartnerReports: '/partner/reports',
  SelectReports: '/check-score',
};

export function createPageUrl(pageName: string): string {
  return PAGE_ROUTES[pageName] || '/dashboard';
}
