import type { BiFilters } from '../../lib/biApi';
import { INPUT_STYLE, LABEL_STYLE, RESET_BTN } from './chartStyles';

interface Props {
  devices: string[];
  dateMin: string | null;
  dateMax: string | null;
  filters: BiFilters;
  granularity: 'day' | 'week' | 'month';
  onFilters: (f: BiFilters) => void;
  onGranularity: (g: 'day' | 'week' | 'month') => void;
}

export default function FiltersBar({
  devices, dateMin, dateMax, filters, granularity, onFilters, onGranularity,
}: Props) {
  return (
    <div
      className="card"
      style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}
      data-testid="bi-filters-bar"
    >
      <div style={{ minWidth: 200 }}>
        <label style={LABEL_STYLE}>Dispositivo</label>
        <select
          value={filters.dispositivo || 'all'}
          onChange={e => onFilters({ ...filters, dispositivo: e.target.value })}
          style={INPUT_STYLE}
          data-testid="bi-filter-device"
        >
          <option value="all">Todos</option>
          {devices.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label style={LABEL_STYLE}>Desde</label>
        <input
          type="date"
          value={filters.desde || ''}
          min={dateMin || undefined}
          max={dateMax || undefined}
          onChange={e => onFilters({ ...filters, desde: e.target.value || undefined })}
          style={INPUT_STYLE}
          data-testid="bi-filter-from"
        />
      </div>
      <div>
        <label style={LABEL_STYLE}>Hasta</label>
        <input
          type="date"
          value={filters.hasta || ''}
          min={dateMin || undefined}
          max={dateMax || undefined}
          onChange={e => onFilters({ ...filters, hasta: e.target.value || undefined })}
          style={INPUT_STYLE}
          data-testid="bi-filter-to"
        />
      </div>
      <div>
        <label style={LABEL_STYLE}>Agrupar serie</label>
        <select
          value={granularity}
          onChange={e => onGranularity(e.target.value as 'day' | 'week' | 'month')}
          style={INPUT_STYLE}
          data-testid="bi-filter-granularity"
        >
          <option value="day">Por día</option>
          <option value="week">Por semana</option>
          <option value="month">Por mes</option>
        </select>
      </div>
      <button
        onClick={() => onFilters({ dispositivo: 'all' })}
        style={RESET_BTN}
        data-testid="bi-filter-reset"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
