/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Responsible {
  name: string;
  initials: string;
  avatarUrl?: string;
}

export type AssetStatus = 'Em Uso' | 'Manutenção' | 'Armazenado' | 'Extraviado';

export type TimelineType = 'transfer' | 'maintenance' | 'reception' | 'scan' | 'creation';

export interface TimelineStep {
  id: string;
  title: string;
  responsible: string;
  date: string;
  time: string;
  type: TimelineType;
  description: string;
  attachmentName?: string;
}

export interface Asset {
  id: string; // e.g., "KINETIC-8821" or "AST-2024-00892"
  patrimonio: string; // e.g. "#PAT-004452"
  name: string; // e.g. "Server Rack Unit Pro-X5"
  category: string; // Notebooks, Desktops, Switches, Monitores, Nobreaks, Mobiliário, Impressoras, Hardware de Rede
  model: string;
  serialNumber: string;
  unit: string; // Matriz - São Paulo, Filial - Rio de Janeiro, CD Logístico, Depósito - Paraná
  location: string; // Escritório A, Sala de Reunião, CPD A, CD Logístico, etc.
  currentFloor: string; // Percentage coords (0-100) for the SVG map
  mapCoordinates: { x: number; y: number }; // Percentage coords (0-100) for the SVG map
  responsible: Responsible;
  status: AssetStatus;
  value: number; // e.g. 45200.00
  acquisitionDate: string; // YYYY-MM-DD
  warrantyExpiry: string; // YYYY-MM-DD
  specifications: Record<string, string>; // label: value
  history: TimelineStep[];
  imageUrl?: string;
}

export type ActiveScreen = 'dashboard' | 'inventory' | 'units' | 'scanner' | 'detail' | 'monitoring';

export interface QueryFilters {
  unit: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
}
