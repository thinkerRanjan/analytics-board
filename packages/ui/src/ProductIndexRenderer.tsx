import Link from "next/link";
import type { ProductModel } from "@analytics/shared";
import { productModelHref } from "@analytics/shared";

type ProductIndexRendererProps = {
  pageId: string;
  models: ProductModel[];
  query?: string;
  valueLabel?: string;
};

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function ProductIndexRenderer({
  pageId,
  models,
  query,
  valueLabel = "configurator opens",
}: ProductIndexRendererProps) {
  if (models.length === 0) {
    return (
      <div className="surface-dashed flex h-48 items-center justify-center px-6 text-center text-sm text-muted">
        No car models recorded in this range.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((model) => {
        const href = query
          ? `${productModelHref(pageId, model.name)}?${query}`
          : productModelHref(pageId, model.name);

        return (
          <li key={model.name}>
            <Link href={href} className="surface-card group block p-4 transition-colors hover:border-accent">
              <p className="text-sm font-semibold text-foreground group-hover:text-accent">
                {model.name}
              </p>
              <p className="mt-1 text-xs text-muted">
                {compact.format(model.value)} {valueLabel}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
