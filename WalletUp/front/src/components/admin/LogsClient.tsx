import { useState, useEffect } from 'react';

interface Log {
  id: number;
  usuario_id: number;
  username: string;
  accion: string;
  fecha: string;
}

export default function LogsClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filtroUsuario, setFiltroUsuario] = useState<string>('');
  const [filtroAccion, setFiltroAccion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const logsPerPage = 20;

  useEffect(() => {
    cargarLogs();
  }, []);

  const cargarLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/admin/logs', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Error al cargar logs');
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError('Error al cargar logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const logsFiltrados = logs.filter(log => {
    if (filtroUsuario && !log.username.toLowerCase().includes(filtroUsuario.toLowerCase())) {
      return false;
    }
    if (filtroAccion && !log.accion.toLowerCase().includes(filtroAccion.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(logsFiltrados.length / logsPerPage);
  const startIdx = (paginaActual - 1) * logsPerPage;
  const endIdx = startIdx + logsPerPage;
  const logsActuales = logsFiltrados.slice(startIdx, endIdx);

  const getAccionIcon = (accion: string) => {
    if (accion.includes('login')) return '🔓';
    if (accion.includes('logout')) return '🔒';
    if (accion.includes('crear') || accion.includes('create')) return '➕';
    if (accion.includes('editar') || accion.includes('update')) return '✏️';
    if (accion.includes('eliminar') || accion.includes('delete')) return '🗑️';
    if (accion.includes('usuario')) return '👤';
    if (accion.includes('transaccion')) return '💳';
    if (accion.includes('meta')) return '🎯';
    return '📋';
  };

  if (loading) {
    return <div className="loading-container">Cargando logs...</div>;
  }

  return (
    <div className="logs-container">
      <div className="logs-header">
        <h1>Logs de Auditoría</h1>
        <button className="btn btn-outline btn-sm" onClick={cargarLogs}>
          🔄 Actualizar
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="filter-usuario">Filtrar por Usuario</label>
          <input
            id="filter-usuario"
            type="text"
            value={filtroUsuario}
            onChange={(e) => {
              setFiltroUsuario(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Ingresa un username..."
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-accion">Filtrar por Acción</label>
          <input
            id="filter-accion"
            type="text"
            value={filtroAccion}
            onChange={(e) => {
              setFiltroAccion(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Ingresa una acción..."
          />
        </div>

        {(filtroUsuario || filtroAccion) && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setFiltroUsuario('');
              setFiltroAccion('');
              setPaginaActual(1);
            }}
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      <div className="logs-info">
        <p>Total de registros: <strong>{logsFiltrados.length}</strong> de <strong>{logs.length}</strong></p>
      </div>

      <div className="table-responsive">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Acción</th>
              <th>Usuario</th>
              <th>Detalles</th>
              <th>Fecha & Hora</th>
            </tr>
          </thead>
          <tbody>
            {logsActuales.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-row">
                  {logs.length === 0 ? 'Sin registros en el sistema' : 'No hay registros que coincidan con los filtros'}
                </td>
              </tr>
            ) : (
              logsActuales.map((log) => (
                <tr key={log.id} className="log-row">
                  <td>
                    <span className="accion-badge">
                      {getAccionIcon(log.accion)} {log.accion}
                    </span>
                  </td>
                  <td><strong>{log.username}</strong></td>
                  <td><code>{log.accion}</code></td>
                  <td className="fecha">
                    {new Date(log.fecha).toLocaleString('es-ES')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-outline btn-sm"
            disabled={paginaActual === 1}
            onClick={() => setPaginaActual(paginaActual - 1)}
          >
            ← Anterior
          </button>

          <div className="pagination-info">
            Página <strong>{paginaActual}</strong> de <strong>{totalPages}</strong>
          </div>

          <button
            className="btn btn-outline btn-sm"
            disabled={paginaActual === totalPages}
            onClick={() => setPaginaActual(paginaActual + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

const styles = `
  .logs-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .logs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logs-header h1 {
    margin: 0;
  }

  .filters-section {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 200px;
  }

  .filter-group label {
    font-weight: 500;
    font-size: 0.85rem;
    color: var(--text-dark);
    text-transform: uppercase;
  }

  .filter-group input {
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 0.95rem;
  }

  .filter-group input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .logs-info {
    background: #f0f7ff;
    border-radius: var(--radius);
    padding: 1rem;
    border-left: 4px solid var(--primary-color);
  }

  .logs-info p {
    margin: 0;
    color: var(--text-dark);
  }

  .table-responsive {
    overflow-x: auto;
    background: var(--white);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .logs-table {
    width: 100%;
    border-collapse: collapse;
  }

  .logs-table th {
    background: var(--light-bg);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-dark);
    border: none;
  }

  .logs-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .log-row:hover {
    background: var(--light-bg);
  }

  .accion-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: var(--light-bg);
    border-radius: var(--radius);
    font-size: 0.85rem;
    font-weight: 500;
  }

  .empty-row {
    text-align: center;
    padding: 2rem !important;
    color: var(--text-light);
  }

  code {
    background: var(--light-bg);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.85rem;
    color: var(--text-dark);
    word-break: break-word;
  }

  .fecha {
    font-size: 0.9rem;
    color: var(--text-light);
    white-space: nowrap;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--white);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .pagination-info {
    color: var(--text-dark);
  }

  .loading-container {
    text-align: center;
    padding: 2rem;
    color: var(--text-light);
  }

  @media (max-width: 768px) {
    .logs-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .filters-section {
      flex-direction: column;
    }

    .filter-group {
      min-width: 100%;
    }

    .logs-table th,
    .logs-table td {
      padding: 0.75rem;
      font-size: 0.9rem;
    }

    .pagination {
      flex-direction: column;
      gap: 0.75rem;
    }

    .pagination .btn {
      width: 100%;
    }
  }
`;
