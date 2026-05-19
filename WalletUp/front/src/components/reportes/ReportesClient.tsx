import { useState, useEffect } from 'react';
import { reportesService } from '../../services/reportes';
import type { Reporte } from '../../types';

export default function ReportesClient() {
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [tendencias, setTendencias] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<'resumen' | 'tendencias' | 'categorias'>('resumen');

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      setError(null);

      const [rep, tend] = await Promise.all([
        reportesService.obtenerResumen(),
        reportesService.obtenerTendencias(),
      ]);

      setReporte(rep);
      setTendencias(tend);
    } catch (err) {
      setError('Error al cargar reportes');
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

  // Agrupar tendencias por tipo
  const ingresosPorDia = tendencias.filter(t => t.tipo === 'ingreso');
  const gastosPorDia = tendencias.filter(t => t.tipo === 'gasto');

  // Calcular totales diarios
  const diasUnicos = new Set(tendencias.map(t => t.fecha));
  const resumenDiario = Array.from(diasUnicos).map(dia => {
    const ingresos = ingresosPorDia.filter(t => t.fecha === dia).reduce((sum, t) => sum + t.monto, 0);
    const gastos = gastosPorDia.filter(t => t.fecha === dia).reduce((sum, t) => sum + t.monto, 0);
    return { dia, ingresos, gastos, balance: ingresos - gastos };
  }).sort((a, b) => a.dia.localeCompare(b.dia));

  const tasaAhorro = reporte.ingresos > 0 ? ((reporte.balance / reporte.ingresos) * 100).toFixed(1) : 0;

  return (
    <div className="reportes-container">
      <h1>Mis Reportes</h1>

      {/* Controles de vista */}
      <div className="vista-controls">
        <button
          className={`btn ${vista === 'resumen' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setVista('resumen')}
        >
          Resumen
        </button>
        <button
          className={`btn ${vista === 'tendencias' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setVista('tendencias')}
        >
          Tendencias
        </button>
        <button
          className={`btn ${vista === 'categorias' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setVista('categorias')}
        >
          Por Categoría
        </button>
      </div>

      {/* RESUMEN */}
      {vista === 'resumen' && (
        <div className="reporte-view">
          <div className="summary-cards">
            <div className="summary-card balance">
              <h3>Balance Total</h3>
              <div className={`amount ${reporte.balance >= 0 ? 'positive' : 'negative'}`}>
                ${reporte.balance.toFixed(2)}
              </div>
              <p className="rate">Tasa de ahorro: {tasaAhorro}%</p>
            </div>

            <div className="summary-card ingresos">
              <h3>Ingresos</h3>
              <div className="amount positive">
                ${reporte.ingresos.toFixed(2)}
              </div>
              <p className="icon">📈</p>
            </div>

            <div className="summary-card gastos">
              <h3>Gastos</h3>
              <div className="amount negative">
                ${reporte.gastos.toFixed(2)}
              </div>
              <p className="icon">📉</p>
            </div>
          </div>

          <div className="summary-info">
            <h3>Información General</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Diferencia</span>
                <span className={`value ${reporte.ingresos > reporte.gastos ? 'positive' : 'negative'}`}>
                  {reporte.ingresos > reporte.gastos ? '+' : ''}{(reporte.ingresos - reporte.gastos).toFixed(2)}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Ratio Ingreso/Gasto</span>
                <span className="value">
                  {reporte.gastos > 0 ? (reporte.ingresos / reporte.gastos).toFixed(2) : '∞'}x
                </span>
              </div>
              <div className="info-item">
                <span className="label">% de gastos vs ingresos</span>
                <span className="value">
                  {reporte.ingresos > 0 ? ((reporte.gastos / reporte.ingresos) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="info-item">
                <span className="label">Categorías activas</span>
                <span className="value">{reporte.gastos_por_categoria.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TENDENCIAS */}
      {vista === 'tendencias' && (
        <div className="reporte-view">
          <h2>Tendencias (Últimos 30 días)</h2>

          {resumenDiario.length === 0 ? (
            <div className="empty-state">
              <p>No hay datos de tendencias disponibles</p>
            </div>
          ) : (
            <div className="tendencias-table">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="ingreso">Ingresos</th>
                    <th className="gasto">Gastos</th>
                    <th className="balance">Balance del Día</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenDiario.map((dia, idx) => (
                    <tr key={idx}>
                      <td>{new Date(dia.dia).toLocaleDateString('es-ES')}</td>
                      <td className="ingreso positive">${dia.ingresos.toFixed(2)}</td>
                      <td className="gasto negative">-${dia.gastos.toFixed(2)}</td>
                      <td className={`balance ${dia.balance >= 0 ? 'positive' : 'negative'}`}>
                        {dia.balance >= 0 ? '+' : ''}${dia.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* POR CATEGORÍA */}
      {vista === 'categorias' && (
        <div className="reporte-view">
          <h2>Gastos por Categoría</h2>

          {reporte.gastos_por_categoria.length === 0 ? (
            <div className="empty-state">
              <p>Sin gastos aún en categorías</p>
            </div>
          ) : (
            <>
              <div className="categorias-chart">
                {reporte.gastos_por_categoria.map((cat, idx) => {
                  const maxGasto = Math.max(...reporte.gastos_por_categoria.map(c => c.monto));
                  const porcentaje = (cat.monto / maxGasto) * 100;
                  const proporcionTotal = (cat.monto / reporte.gastos) * 100;

                  return (
                    <div key={idx} className="categoria-item">
                      <div className="categoria-header">
                        <span className="categoria-name">
                          {cat.icono} {cat.nombre}
                        </span>
                        <span className="categoria-amount">${cat.monto.toFixed(2)}</span>
                      </div>
                      <div className="categoria-bar">
                        <div
                          className="categoria-progress"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                      <span className="categoria-percentage">{proporcionTotal.toFixed(1)}% del total</span>
                    </div>
                  );
                })}
              </div>

              <div className="categorias-table">
                <table>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Monto</th>
                      <th>% del Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.gastos_por_categoria.map((cat, idx) => (
                      <tr key={idx}>
                        <td>{cat.icono} {cat.nombre}</td>
                        <td>${cat.monto.toFixed(2)}</td>
                        <td>{((cat.monto / reporte.gastos) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles = `
  .reportes-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .reportes-container h1 {
    margin: 0;
  }

  .vista-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .vista-controls .btn {
    padding: 0.75rem 1.5rem;
    border: 2px solid var(--border-color);
    border-radius: var(--radius);
    cursor: pointer;
    transition: var(--transition);
    font-weight: 500;
  }

  .vista-controls .btn-outline {
    background: var(--white);
    color: var(--text-dark);
  }

  .vista-controls .btn-outline:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .vista-controls .btn-primary {
    background: var(--primary-color);
    color: var(--white);
    border-color: var(--primary-color);
  }

  .reporte-view {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .summary-card {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    text-align: center;
  }

  .summary-card h3 {
    margin: 0 0 1rem 0;
    color: var(--text-light);
    font-size: 0.9rem;
    text-transform: uppercase;
    font-weight: 600;
  }

  .summary-card .amount {
    font-size: 2rem;
    font-weight: bold;
    margin: 0.5rem 0;
  }

  .summary-card .amount.positive {
    color: var(--secondary-color);
  }

  .summary-card .amount.negative {
    color: var(--danger-color);
  }

  .summary-card .rate {
    color: var(--text-light);
    margin: 0.5rem 0 0 0;
    font-size: 0.9rem;
  }

  .summary-card .icon {
    font-size: 2rem;
    margin: 0.5rem 0 0 0;
  }

  .summary-info {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
  }

  .summary-info h3 {
    margin: 0 0 1.5rem 0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--light-bg);
    border-radius: var(--radius);
  }

  .info-item .label {
    font-size: 0.8rem;
    color: var(--text-light);
    text-transform: uppercase;
    font-weight: 600;
  }

  .info-item .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-dark);
  }

  .info-item .value.positive {
    color: var(--secondary-color);
  }

  .info-item .value.negative {
    color: var(--danger-color);
  }

  .reporte-view h2 {
    margin: 0 0 1.5rem 0;
    color: var(--text-dark);
  }

  .tendencias-table {
    background: var(--white);
    border-radius: var(--radius);
    overflow: auto;
    box-shadow: var(--shadow);
  }

  .tendencias-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .tendencias-table th {
    background: var(--light-bg);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-dark);
    font-size: 0.9rem;
  }

  .tendencias-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .tendencias-table tbody tr:hover {
    background: var(--light-bg);
  }

  .tendencias-table .ingreso {
    color: var(--secondary-color);
    font-weight: 600;
  }

  .tendencias-table .gasto {
    color: var(--danger-color);
    font-weight: 600;
  }

  .tendencias-table .balance.positive {
    color: var(--secondary-color);
    font-weight: 600;
  }

  .tendencias-table .balance.negative {
    color: var(--danger-color);
    font-weight: 600;
  }

  .categorias-chart {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    margin-bottom: 1.5rem;
  }

  .categoria-item {
    margin-bottom: 1.5rem;
  }

  .categoria-item:last-child {
    margin-bottom: 0;
  }

  .categoria-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .categoria-name {
    font-weight: 500;
    color: var(--text-dark);
  }

  .categoria-amount {
    font-weight: 600;
    color: var(--text-dark);
  }

  .categoria-bar {
    height: 24px;
    background: var(--light-bg);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .categoria-progress {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .categoria-percentage {
    display: block;
    font-size: 0.8rem;
    color: var(--text-light);
  }

  .categorias-table {
    background: var(--white);
    border-radius: var(--radius);
    overflow: auto;
    box-shadow: var(--shadow);
  }

  .categorias-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .categorias-table th {
    background: var(--light-bg);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-dark);
  }

  .categorias-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .categorias-table tbody tr:hover {
    background: var(--light-bg);
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    background: var(--white);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    color: var(--text-light);
  }

  .loading-container {
    text-align: center;
    padding: 2rem;
    color: var(--text-light);
  }

  @media (max-width: 768px) {
    .summary-cards {
      grid-template-columns: 1fr;
    }

    .info-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;
