import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { WorldState } from '../../src/domain'
import { STAFF_ROLE_SPECS, buildStaffPool } from '../../src/domain'
import { StaffScreen } from '../../src/ui/screens/StaffScreen'
import { MorePrimaryColumn } from '../../src/ui/screens/more/MorePrimaryColumn'
import { useGameStore } from '../../src/store/gameStore'
import { generateWorld } from '../../src/world/generator'
import { TEST_NOW, testOptions } from '../fixtures/career'
import { member } from '../fixtures/staff'

afterEach(() => {
  cleanup()
  useGameStore.setState({ world: null, notice: null, error: null })
})

/** 用一个真生成出来的世界，只把余额与名册换成用例要的样子。 */
function teamWorld(balance: number, staff: WorldState['staff'] = []): WorldState {
  const world = generateWorld(testOptions(), TEST_NOW)
  return { ...world, staff, finance: { ...world.finance, balance } }
}

function renderScreen(world: WorldState) {
  useGameStore.setState({ world, hydrated: true })
  return render(
    <MemoryRouter initialEntries={['/staff']}>
      <StaffScreen />
    </MemoryRouter>,
  )
}

/** £10,000 的余额够付任何一个候选人的第一周周薪。 */
const RICH = 1_000_000

describe('个人团队页', () => {
  it('空团队时说清三个位置各管什么，并把可聘的人摆出来', () => {
    const world = teamWorld(RICH)
    renderScreen(world)

    expect(screen.getByText('个人团队')).toBeTruthy()
    expect(screen.getByText('团队是空的')).toBeTruthy()
    for (const role of ['doctor', 'psychologist', 'trainer'] as const) {
      expect(screen.getByText(STAFF_ROLE_SPECS[role].dutyZh)).toBeTruthy()
    }
    for (const candidate of buildStaffPool(world.seed, world.season)) {
      expect(screen.getAllByText(candidate.nameZh).length).toBeGreaterThan(0)
    }
  })

  it('在职区把中文名、标了「原名」的拉丁名、水平与周薪摆出来，并给一个解雇按钮', () => {
    const doctor = member('doctor', 90)
    renderScreen(teamWorld(RICH, [doctor]))

    expect(screen.getByText('测试成员')).toBeTruthy()
    expect(screen.getByText('原名 Probe Person')).toBeTruthy()
    expect(screen.getByText('£98')).toBeTruthy()
    expect(screen.getByRole('button', { name: '解雇 测试成员' })).toBeTruthy()
  })

  it('有队医时把系数写成人话', () => {
    renderScreen(teamWorld(RICH, [member('doctor', 90)]))

    expect(screen.getByText(/受伤概率/)).toBeTruthy()
    expect(screen.getByText(/伤停天数/)).toBeTruthy()
  })

  it('一个人都没有时说明数字保持原样', () => {
    renderScreen(teamWorld(RICH))

    expect(screen.getByText(/全都保持原样/)).toBeTruthy()
  })

  it('这个位置已经有现任时，同角色的其余候选人不给雇佣按钮', () => {
    const world = teamWorld(RICH, [member('doctor', 90)])
    renderScreen(world)
    const doctors = buildStaffPool(world.seed, world.season).filter((item) => item.role === 'doctor')

    expect(screen.getAllByText('已有队医')).toHaveLength(doctors.length)
    for (const candidate of doctors) {
      expect(screen.queryByRole('button', { name: `雇 ${candidate.nameZh}` })).toBeNull()
    }
    expect(screen.getAllByRole('button', { name: /^雇 / })).toHaveLength(6)
  })

  it('余额不够付第一周周薪时不给死按钮，只报这道门槛', () => {
    renderScreen(teamWorld(1000))

    expect(screen.queryAllByRole('button', { name: /^雇 / })).toHaveLength(0)
    expect(screen.getAllByText('余额不够')).toHaveLength(9)
  })
})

describe('个人团队页的操作', () => {
  it('点雇佣把候选 id 交给 store 通道', () => {
    const world = teamWorld(RICH)
    const hire = vi.fn()
    useGameStore.setState({ world, hydrated: true, hireTeamMember: hire })
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <StaffScreen />
      </MemoryRouter>,
    )
    const offer = buildStaffPool(world.seed, world.season)[0]

    fireEvent.click(screen.getByRole('button', { name: `雇 ${offer.nameZh}` }))

    expect(hire).toHaveBeenCalledWith(offer.id)
  })

  it('点解雇把成员 id 交给 store 通道', () => {
    const doctor = member('doctor', 90)
    const release = vi.fn().mockResolvedValue(true)
    useGameStore.setState({
      world: teamWorld(RICH, [doctor]),
      hydrated: true,
      releaseTeamMember: release,
    })
    render(
      <MemoryRouter initialEntries={['/staff']}>
        <StaffScreen />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '解雇 测试成员' }))

    expect(release).toHaveBeenCalledWith(doctor.id)
  })

  it('更多页把个人团队入口摆在资金运用旁边', () => {
    const world = teamWorld(RICH)
    useGameStore.setState({ world, hydrated: true })
    render(
      <MemoryRouter>
        <MorePrimaryColumn world={world} />
      </MemoryRouter>,
    )

    expect(screen.getByText('个人团队')).toBeTruthy()
    expect(screen.getByText('队医、心理咨询师与私人教练')).toBeTruthy()
  })
})
