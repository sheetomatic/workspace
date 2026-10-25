# Meta dashboard canvas

References reviewed: https://ui.shadcn.com/examples/dashboard (overview/metric-card hierarchy) and https://www.tremor.so/ (restrained analytics presentation). Original scoped CSS and component implementation; no imported third-party template or copied brand graphics.

Soft neutral canvas, white bordered surfaces, teal activity bars, four KPI cards, account/date context, 7/30-day links, metric switches, exact-value accessible table, action bars and separately labelled derived CTR/CPC. INR and Indian number formatting. Missing reporting never appears as confirmed zero. Daily rows are actual API responses; gaps are disclosed. Period reach is not summed from daily reach. Actions may overlap and are not combined into leads.

Only the Meta reporting page/service is changed. Primary-admin authorization, fixed ad account, server-only token and no-store requests remain. No campaign writes, credentials, payments, emails or migrations. Daily API requests use the existing authorized token. A failed daily request preserves valid aggregate totals. Paginated/incomplete daily responses are not plotted.
