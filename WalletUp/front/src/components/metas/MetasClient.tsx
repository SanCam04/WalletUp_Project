import { useState, useEffect } from 'react';
import { metasService } from '../../services/metas';
import type { Meta, MetaForm, AportarForm } from '../../types';

export default function MetasClient() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [aportandoId, setAportandoId] = useState<number | null>(null);
  const [montoAporte, setMontoAporte] = useState<number>(0);

  const [formData, setFormData] = useState<MetaForm>({
    nombre: '',
    monto_objetivo: 0,
    fecha_target: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const metasList = await metasService.listar();
      setMetas(metasList);
    } catch (err) {
      setError('Error al cargar metas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'monto_objetivo' ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.nombre || !formData.monto_objetivo || !formData.fecha_target) {
        setError('Completa todos los campos requeridos');
        return;
      }

      if (editingId) {
        await metasService.editar(editingId, formData);
      } else {
        await metasService.crear(formData);
      }

      resetForm();
      cargarDatos();
    } catch (err) {
      setError('Error al guardar meta');
      console.error(err);
    }
  };

  const handleAportar = async (e: React.FormEvent, metaId: number) => {
    e.preventDefault();
    try {
      if (!montoAporte || montoAporte <= 0) {
        setError('Ingresa un monto válido');
        return;
      }

      const data: AportarForm = { monto: montoAporte };
      await metasService.aportar(metaId, data);
      setMontoAporte(0);
      setAportandoId(null);
      cargarDatos();
    } catch (err) {
      setError('Error al realizar aporte');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Cancelar esta meta?')) return;
    try {
      await metasService.eliminar(id);
      cargarDatos();
    } catch (err) {
      setError('Error al cancelar meta');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      monto_objetivo: 0,
      fecha_target: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading && !showForm) {
    return <div className="loading-container">Cargando metas...</div>;
  }

  const metasActivas = metas.filter(m => m.estado === 'activa');
  const metasCompletadas = metas.filter(m => m.estado === 'completada');
  const metasCanceladas = metas.filter(m => m.estado === 'cancelada');

  return (
    <div className="metas-container">
      <div className="metas-header">
        <h1>Mis Metas de Ahorro</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nueva Meta
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Editar' : 'Nueva'} Meta</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  id="nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleFormChange}
                  placeholder="Ej: Vacaciones"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="monto_objetivo">Monto Objetivo *</label>
                <input
                  id="monto_objetivo"
                  type="number"
                  name="monto_objetivo"
                  value={formData.monto_objetivo || ''}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fecha_target">Fecha Meta *</label>
                <input
                  id="fecha_target"
                  type="date"
                  name="fecha_target"
                  value={formData.fecha_target}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Meta
              </button>
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {metasActivas.length > 0 && (
        <div className="metas-section">
          <h2>Metas Activas</h2>
          <div className="metas-grid">
            {metasActivas.map((meta) => (
              <div key={meta.id} className="meta-card">
                <div className="meta-card-header">
                  <h3>{meta.nombre}</h3>
                  <span className="meta-status activa">Activa</span>
                </div>

                <div className="meta-progress-bar">
                  <div
                    className="meta-progress"
                    style={{ width: `${meta.progreso}%` }}
                  />
                </div>

                <div className="meta-stats">
                  <div className="stat">
                    <span className="label">Ahorrado</span>
                    <span className="value">${meta.monto_actual.toFixed(2)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Meta</span>
                    <span className="value">${meta.monto_objetivo.toFixed(2)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Progreso</span>
                    <span className="value">{meta.progreso.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="meta-target-date">
                  📅 Fecha meta: {new Date(meta.fecha_target).toLocaleDateString('es-ES')}
                </div>

                {aportandoId === meta.id ? (
                  <form onSubmit={(e) => handleAportar(e, meta.id)} className="aporte-form">
                    <input
                      type="number"
                      value={montoAporte}
                      onChange={(e) => setMontoAporte(Number(e.target.value))}
                      placeholder="Monto a aportar"
                      step="0.01"
                      min="0"
                      required
                      autoFocus
                    />
                    <button type="submit" className="btn btn-sm btn-primary">
                      Aportar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        setAportandoId(null);
                        setMontoAporte(0);
                      }}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="meta-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setAportandoId(meta.id)}
                    >
                      + Aportar
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(meta.id)}
                      title="Cancelar"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {metasActivas.length === 0 && metasCompletadas.length === 0 && (
        <div className="empty-state">
          <p>No hay metas. ¡Crea una para empezar a ahorrar!</p>
        </div>
      )}

      {metasCompletadas.length > 0 && (
        <div className="metas-section completed">
          <h2>Metas Completadas</h2>
          <div className="metas-grid">
            {metasCompletadas.map((meta) => (
              <div key={meta.id} className="meta-card completed">
                <div className="meta-card-header">
                  <h3>{meta.nombre}</h3>
                  <span className="meta-status completada">✓ Completada</span>
                </div>
                <div className="meta-progress-bar complete">
                  <div className="meta-progress" style={{ width: '100%' }} />
                </div>
                <div className="meta-stats">
                  <span className="value">${meta.monto_actual.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metasCanceladas.length > 0 && (
        <div className="metas-section cancelled">
          <h2>Metas Canceladas</h2>
          <div className="metas-grid">
            {metasCanceladas.map((meta) => (
              <div key={meta.id} className="meta-card cancelled">
                <h3>{meta.nombre}</h3>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = `
  .metas-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .metas-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .metas-header h1 {
    margin: 0;
  }

  .form-card {
    background-color: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
  }

  .form-card h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 500;
    color: var(--text-dark);
    font-size: 0.9rem;
  }

  .form-group input {
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 1rem;
    transition: var(--transition);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(51, 102, 204, 0.1);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
  }

  .metas-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .metas-section h2 {
    margin: 0;
    color: var(--text-dark);
  }

  .metas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .meta-card {
    background-color: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border: 2px solid var(--secondary-color);
    transition: var(--transition);
  }

  .meta-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .meta-card.completed {
    border-color: #27ae60;
    opacity: 0.8;
  }

  .meta-card.cancelled {
    border-color: var(--border-color);
    opacity: 0.6;
  }

  .meta-card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 0.5rem;
  }

  .meta-card-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-dark);
    flex: 1;
  }

  .meta-status {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    white-space: nowrap;
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
    height: 10px;
    background-color: var(--border-color);
    border-radius: 5px;
    overflow: hidden;
  }

  .meta-progress-bar.complete {
    background-color: #d1ecf1;
  }

  .meta-progress {
    height: 100%;
    background: linear-gradient(90deg, var(--secondary-color), #27ae60);
    border-radius: 5px;
    transition: width 0.5s ease;
  }

  .meta-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .meta-card.completed .meta-stats {
    grid-template-columns: 1fr;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat .label {
    font-size: 0.75rem;
    color: var(--text-light);
    text-transform: uppercase;
    font-weight: 600;
  }

  .stat .value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-dark);
  }

  .meta-target-date {
    font-size: 0.9rem;
    color: var(--text-light);
    text-align: center;
  }

  .aporte-form {
    display: flex;
    gap: 0.5rem;
  }

  .aporte-form input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 0.95rem;
  }

  .meta-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .btn-icon {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0.5rem;
    border-radius: var(--radius);
    transition: var(--transition);
  }

  .btn-icon:hover {
    background-color: var(--light-bg);
  }

  .btn-icon.delete:hover {
    color: var(--danger-color);
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    background-color: var(--white);
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
    .metas-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .metas-grid {
      grid-template-columns: 1fr;
    }

    .meta-stats {
      grid-template-columns: 1fr;
    }
  }
`;
