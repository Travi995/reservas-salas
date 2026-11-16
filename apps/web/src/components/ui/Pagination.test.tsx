import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'
import { pageWindow } from './page-window'

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3])
  })
  it('collapses distant pages into gaps', () => {
    expect(pageWindow(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12])
    expect(pageWindow(1, 12)).toEqual([1, 2, 'gap', 12])
  })
})

describe('Pagination', () => {
  const meta = { page: 2, pageSize: 10, totalItems: 25, totalPages: 3 }

  it('renders the range from the server meta and asks for another page', async () => {
    const onPageChange = vi.fn()
    render(<Pagination meta={meta} onPageChange={onPageChange} />)
    expect(screen.getByText('11–20 de 25')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('offers a page-size selector only when asked, and reports the chosen size', async () => {
    const onPageSizeChange = vi.fn()
    const { rerender } = render(<Pagination meta={meta} onPageChange={() => {}} />)
    expect(screen.queryByRole('combobox', { name: 'Por página' })).not.toBeInTheDocument()

    rerender(
      <Pagination
        meta={meta}
        onPageChange={() => {}}
        pageSizeOptions={[5, 10, 20]}
        onPageSizeChange={onPageSizeChange}
      />,
    )
    const select = screen.getByRole('combobox', { name: 'Por página' })
    expect(select).toHaveTextContent('10')
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: '20' }))
    expect(onPageSizeChange).toHaveBeenCalledWith(20)
  })

  it('renders nothing for an empty list', () => {
    const { container } = render(
      <Pagination meta={{ ...meta, totalItems: 0, totalPages: 0, page: 1 }} onPageChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
