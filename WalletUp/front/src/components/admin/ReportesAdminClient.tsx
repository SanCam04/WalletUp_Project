import { useState, useEffect } from 'react';

interface ReporteAdmin {
  total_usuarios: number;
  usuarios_activos: number;
  total_transacciones: number;
  monto_total_transacciones: number;
  total_metas: number;
  metas_completadas: number;
  usuarios_por_mes: any[];
}

export default function ReportesAdminClient() {
  const [reporte, setReporte] = useState<ReporteAdmin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/admin/reportes', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Error al cargar reportes');
      const data = await response.json();
      setReporte(data);
    } catch (err) {
      setError('Error al cargar reportes administrativos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Cargando reportes...</div>;
  }

  if (error || !reporte) {
    return <div className="alert alert-error">{error || 'Error desconocido'}</div>;
  }

  const tasaActividad = reporte.total_usuarios > 0 ? ((reporte.usuarios_activos / reporte.total_usuarios) * 100).toFixed(1) : 0;
  const tasaCompletacion = reporte.total_metas > 0 ? ((reporte.metas_completadas / reporte.total_metas) * 100).toFixed(1) : 0;

  return (
    <div className="admin-reportes-container">
      <h1>Reportes del Sistema</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total de Usuarios</h3>
            <div className="stat-value">{reporte.total_usuarios}</div>
            <p className="stat-detail">
              {reporte.usuarios_activos} activos ({tasaActividad}%)
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <h3>Total de Transacciones</h3>
            <div className="stat-value">{reporte.total_transacciones}</div>
            <p className="stat-detail">
              ${reporte.monto_total_transacciones.toFixed(2)} movidos
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Total de Metas</h3>
            <div className="stat-value">{reporte.total_metas}</div>
            <p className="stat-detail">
              {reporte.metas_completadas} completadas ({tasaCompletacion}%)
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Promedio por Usuario</h3>
            <div className="stat-value">
              {reporte.total_usuarios > 0
                ? (reporte.total_transacciones / reporte.total_usuarios).toFixed(1)
                : '0'}
            </div>
            <p className="stat-detail">transacciones por usuario</p>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h2>Indicadores Clave de Desempeño</h2>
        <div className="kpis-grid">
          <div className="kpi-item">
            <span className="kpi-label">Tasa de Actividad</span>
            <div className="kpi-progress">
              <div className="kpi-bar" style={{ width: `${tasaActividad}%` }} />
            </div>
            <span className="kpi-value">{tasaActividad}%</span>
          </div>

          <div className="kpi-item">
            <span className="kpi-label">Tasa de Completación de Metas</span>
            <div className="kpi-progress">
              <div className="kpi-bar" style={{ width: `${tasaCompletacion}%` }} />
            </div>
            <span className="kpi-value">{tasaCompletacion}%</span>
          </div>

          <div className="kpi-item">
            <span className="kpi-label">Usuarios Inactivos</span>
            <div className="kpi-stat">
              {reporte.total_usuarios - reporte.usuarios_activos} de {reporte.total_usuarios}
            </div>
          </div>

          <div className="kpi-item">
            <span className="kpi-label">Monto Promedio por Transacción</span>
            <div className="kpi-stat">
              $
              {reporte.total_transacciones > 0
                ? (reporte.monto_total_transacciones / reporte.total_transacciones).toFixed(2)
                : '0.00'}
            </div>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h2>Estadísticas Rápidas</h2>
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="label">Plataforma en uso por:</span>
            <span className="value">{reporte.usuarios_activos} usuarios</span>
          </div>
          <div className="quick-stat">
            <span className="label">Movimiento financiero total:</span>
            <span className="value">${reporte.monto_total_transacciones.toFixed(2)}</span>
          </div>
          <div className="quick-stat">
            <span className="label">Metas pendientes:</span>
            <span className="value">{reporte.total_metas - reporte.metas_completadas}</span>
          </div>
          <div className="quick-stat">
            <span className="label">Metas alcanzadas:</span>
            <span className="value">{reporte.metas_completadas}</span>
          </div>
        </div>
      </div>

      <div className="info-note">
        <p>📌 Última actualización: {new Date().toLocaleString('es-ES')}</p>
      </div>
    </div>
  );
}

const styles = `
  .admin-reportes-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .admin-reportes-container h1 {
    margin: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    display: flex;
    gap: 1rem;
    transition: var(--transition);
  }

  .stat-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: 2.5rem;
    flex-shrink: 0;
  }

  .stat-content {
    flex: 1;
  }

  .stat-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--text-light);
    text-transform: uppercase;
    font-weight: 600;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color);
    margin: 0.5rem 0;
  }

  .stat-detail {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-light);
  }

  .info-section {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
  }

  .info-section h2 {
    margin: 0 0 1.5rem 0;
    color: var(--text-dark);
    border-bottom: 2px solid var(--light-bg);
    padding-bottom: 0.75rem;
  }

  .kpis-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .kpi-item {
    padding: 1rem;
    background: var(--light-bg);
    border-radius: var(--radius);
  }

  .kpi-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-dark);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
  }

  .kpi-progress {
    height: 8px;
    background: var(--border-color);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .kpi-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .kpi-value {
    display: block;
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--primary-color);
    text-align: center;
  }

  .kpi-stat {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-dark);
    text-align: center;
    padding: 0.5rem 0;
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .quick-stat {
    padding: 1rem;
    background: var(--light-bg);
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .quick-stat .label {
    font-size: 0.8rem;
    color: var(--text-light);
    text-transform: uppercase;
    font-weight: 600;
  }

  .quick-stat .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
  }

  .info-note {
    text-align: center;
    padding: 1rem;
    background: #f0f7ff;
    border-radius: var(--radius);
    border-left: 4px solid var(--primary-color);
    color: var(--text-light);
    margin-top: 1rem;
  }

  .info-note p {
    margin: 0;
    font-size: 0.9rem;
  }

  .loading-container {
    text-align: center;
    padding: 2rem;
    color: var(--text-light);
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    .kpis-grid {
      grid-template-columns: 1fr;
    }
  }
`;
