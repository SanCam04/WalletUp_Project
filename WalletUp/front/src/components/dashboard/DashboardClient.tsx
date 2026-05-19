import { useState, useEffect } from 'react';
import { reportesService } from '../../services/reportes';
import { transaccionesService } from '../../services/transacciones';
import { metasService } from '../../services/metas';
import type { Transaccion, Meta } from '../../types';

export default function DashboardClient() {
  const [balance, setBalance] = useState<number>(0);
  const [ingresos, setIngresos] = useState<number>(0);
  const [gastos, setGastos] = useState<number>(0);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar resumen
      const resumen = await reportesService.obtenerResumen();
      setIngresos(resumen.ingresos);
      setGastos(resumen.gastos);
      setBalance(resumen.balance);

      // Cargar últimas transacciones
      const trans = await transaccionesService.listar();
      setTransacciones(trans.slice(0, 5));

      // Cargar metas
      const metasList = await metasService.listar();
      setMetas(metasList.slice(0, 3));
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="dashboard-container">
      {/* Cards de resumen */}
      <div className="cards-grid">
        <div className="card balance-card">
          <div className="card-header">
            <h3>Balance</h3>
            <span className="balance-icon">💰</span>
          </div>
          <div className={`card-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
            ${balance.toFixed(2)}
          </div>
        </div>

        <div className="card ingresos-card">
          <div className="card-header">
            <h3>Ingresos</h3>
            <span className="income-icon">📈</span>
          </div>
          <div className="card-amount positive">
            ${ingresos.toFixed(2)}
          </div>
        </div>

        <div className="card gastos-card">
          <div className="card-header">
            <h3>Gastos</h3>
            <span className="expense-icon">📉</span>
          </div>
          <div className="card-amount negative">
            ${gastos.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Sección de metas */}
      {metas.length > 0 && (
        <div className="section">
          <h2>Mis Metas de Ahorro</h2>
          <div className="metas-list">
            {metas.map((meta) => (
              <div key={meta.id} className="meta-item">
                <div className="meta-header">
                  <h4>{meta.nombre}</h4>
                  <span className={`meta-status ${meta.estado}`}>
                    {meta.estado}
                  </span>
                </div>
                <div className="meta-progress-bar">
                  <div
                    className="meta-progress"
                    style={{ width: `${meta.progreso}%` }}
                  />
                </div>
                <div className="meta-info">
                  <span>${meta.monto_actual.toFixed(2)} de ${meta.monto_objetivo.toFixed(2)}</span>
                  <span className="meta-percentage">{meta.progreso.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas transacciones */}
      {transacciones.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>Últimas Transacciones</h2>
            <a href="/transacciones" className="btn btn-outline btn-sm">
              Ver más
            </a>
          </div>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.map((trans) => (
                <tr key={trans.id}>
                  <td>
                    <span className="category-badge">
                      {trans.icono} {trans.categoria}
                    </span>
                  </td>
                  <td>{trans.descripcion || '-'}</td>
                  <td>
                    <span
                      className={`type-badge ${trans.tipo}`}
                    >
                      {trans.tipo}
                    </span>
                  </td>
                  <td className={`amount ${trans.tipo}`}>
                    ${trans.monto.toFixed(2)}
                  </td>
                  <td>{trans.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {transacciones.length === 0 && (
        <div className="empty-state">
          <p>No hay transacciones aún. ¡Empieza a registrar tus movimientos!</p>
          <a href="/transacciones" className="btn btn-primary">
            Crear Transacción
          </a>
        </div>
      )}
    </div>
  );
}

const styles = `
  .dashboard-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .card {
    background-color: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    transition: var(--transition);
  }

  .card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .card-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-light);
  }

  .card-header span {
    font-size: 1.5rem;
  }

  .card-amount {
    font-size: 2rem;
    font-weight: bold;
  }

  .card-amount.positive {
    color: var(--secondary-color);
  }

  .card-amount.negative {
    color: var(--danger-color);
  }

  .section {
    background-color: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    margin: 0;
  }

  .metas-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .meta-item {
    padding: 1rem;
    background-color: var(--light-bg);
    border-radius: var(--radius);
  }

  .meta-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .meta-header h4 {
    margin: 0;
  }

  .meta-status {
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .meta-status.activa {
    background-color: #d4edda;
    color: #155724;
  }

  .meta-status.completada {
    background-color: #d1ecf1;
    color: #0c5460;
  }

  .meta-progress-bar {
    height: 8px;
    background-color: var(--border-color);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .meta-progress {
    height: 100%;
    background: linear-gradient(90deg, var(--secondary-color), #27ae60);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .meta-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--text-light);
  }

  .meta-percentage {
    font-weight: 600;
    color: var(--text-dark);
  }

  .transactions-table {
    width: 100%;
    border-collapse: collapse;
  }

  .transactions-table th {
    background-color: var(--light-bg);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-dark);
    border: none;
  }

  .transactions-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .transactions-table tr:hover {
    background-color: var(--light-bg);
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background-color: var(--light-bg);
    border-radius: var(--radius);
    font-size: 0.9rem;
  }

  .type-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .type-badge.ingreso {
    background-color: #d4edda;
    color: #155724;
  }

  .type-badge.gasto {
    background-color: #f8d7da;
    color: #721c24;
  }

  .amount {
    font-weight: 600;
  }

  .amount.ingreso {
    color: var(--secondary-color);
  }

  .amount.gasto {
    color: var(--danger-color);
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    background-color: var(--light-bg);
    border-radius: var(--radius);
  }

  .empty-state p {
    color: var(--text-light);
    margin-bottom: 1rem;
  }

  .loading-container {
    text-align: center;
    padding: 2rem;
    color: var(--text-light);
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
`;
