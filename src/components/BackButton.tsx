// Shared top-left back affordance — the single source of truth for the ‹
// button's geometry so it lands at the same screen position on every page:
// icon left edge 12px from the content gutter (px-5 + -ml-2), 36px (h-9 w-9)
// round hit area, text-2xl glyph, text-ink.
//
// Pages with a wider gutter compensate via a wrapper margin (e.g. the -ml-1
// wrapper on the px-6 选择花卉 page) so the on-screen x stays constant.
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'

/** Canonical geometry + color. `className` additions are appended after it. */
const BACK_BUTTON_CLASS =
  '-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-2xl text-ink'

const GLYPH = <span aria-hidden>‹</span>

interface BackButtonBaseProps {
  'aria-label'?: string
  className?: string
}

type BackButtonProps = BackButtonBaseProps &
  (
    | { onClick: () => void; to?: never; params?: never }
    | { onClick?: never; to: LinkProps['to']; params?: LinkProps['params'] }
  )

export default function BackButton({
  'aria-label': ariaLabel = '返回',
  className,
  ...rest
}: BackButtonProps) {
  const cls = className ? `${BACK_BUTTON_CLASS} ${className}` : BACK_BUTTON_CLASS

  if (rest.to !== undefined) {
    return (
      <Link to={rest.to} params={rest.params} aria-label={ariaLabel} className={cls}>
        {GLYPH}
      </Link>
    )
  }
  return (
    <button type="button" onClick={rest.onClick} aria-label={ariaLabel} className={cls}>
      {GLYPH}
    </button>
  )
}
