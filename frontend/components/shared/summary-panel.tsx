import { summaryEntries } from "@/lib/format"

export function SummaryPanel({
  title,
  summary,
  emptyLabel = "Not generated yet.",
}: {
  title: string
  summary?: Record<string, unknown> | null
  emptyLabel?: string
}) {
  const entries = summaryEntries(summary)

  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="pt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <dl className="grid gap-2 pt-2 sm:grid-cols-2">
          {entries.map((entry) => (
            <div key={entry.label} className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium text-muted-foreground">
                {entry.label}
              </dt>
              <dd className="text-sm whitespace-pre-line text-pretty">
                {entry.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
