import type { ReactNode } from "react"

type Props = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function SectionHeading({ title, description, action, className }: Props) {
  return (
    <div
      className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between ${
        className ?? ""
      }`}
    >
      <div>
        <h2 className="font-heading text-base font-semibold leading-tight">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}
