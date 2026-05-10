import type { ComponentType } from 'react'
import type { ModuleProps } from './types'
import TiModule from './TiModule'
import SecomModule from './SecomModule'

// Para adicionar uma nova área: criar NovaAreaModule.tsx e registrar aqui.
const MODULES: Record<string, ComponentType<ModuleProps>> = {
  ti:    TiModule,
  secom: SecomModule,
}

export function getModule(areaSlug: string): ComponentType<ModuleProps> | null {
  return MODULES[areaSlug] ?? null
}
