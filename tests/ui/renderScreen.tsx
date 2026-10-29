import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

export function renderWithRouter(
  node: ReactNode,
  options: { initialEntries?: string[] } = {},
) {
  return render(<MemoryRouter initialEntries={options.initialEntries}>{node}</MemoryRouter>)
}
