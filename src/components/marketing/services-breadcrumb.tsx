import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type ServicesBreadcrumbItem = {
  label: string;
  href?: string;
};

type ServicesBreadcrumbProps = {
  items: ServicesBreadcrumbItem[];
};

export function ServicesBreadcrumb({ items }: ServicesBreadcrumbProps) {
  return (
    <nav className="services-breadcrumb" aria-label="Breadcrumb">
      <ol className="services-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li className="services-breadcrumb-item" key={`${item.label}-${index}`}>
              {index > 0 ? (
                <ChevronRight
                  className="services-breadcrumb-sep"
                  size={14}
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link className="services-breadcrumb-link" href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? "services-breadcrumb-current"
                      : "services-breadcrumb-muted"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
