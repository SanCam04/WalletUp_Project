import { useState, useEffect } from 'react';
import { transaccionesService } from '../../services/transacciones';
import { categoriasService } from '../../services/categorias';
import type { Transaccion, Categoria, TransaccionForm, FiltrosTransaccion } from '../../types';

export default function TransaccionesClient() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'ingreso' | 'gasto' | ''>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState<string>('');
  const [filtroFechaFin, setFiltroFechaFin] = useState<string>('');

  // Formulario
  const [formData, setFormData] = useState<TransaccionForm>({
    monto: 0,
    tipo: 'gasto',
    categoria_id: 0,
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [trans, cats] = await Promise.all([
        transaccionesService.listar(),
        categoriasService.listar(),
      ]);
      setTransacciones(trans);
      setCategorias(cats.filter(c => c.activa));
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      const filtros: FiltrosTransaccion = {};
      if (filtroFechaInicio) filtros.fecha_inicio = filtroFechaInicio;
      if (filtroFechaFin) filtros.fecha_fin = filtroFechaFin;
      if (filtroCategoria) filtros.categoria_id = Number(filtroCategoria);
      if (filtroTipo) filtros.tipo = filtroTipo;

      const trans = await transaccionesService.listar(filtros);
      setTransacciones(trans);
    } catch (err) {
      setError('Error al aplicar filtros');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = async () => {
    setFiltroTipo('');
    setFiltroCategoria('');
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    cargarDatos();
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'monto' || name === 'categoria_id' ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.monto || !formData.categoria_id) {
        setError('Completa los campos requeridos');
        return;
      }

      if (editingId) {
        await transaccionesService.editar(editingId, formData);
      } else {
        await transaccionesService.crear(formData);
      }

      resetForm();
      cargarDatos();
    } catch (err) {
      setError('Error al guardar transacción');
      console.error(err);
    }
  };

  const handleEdit = (trans: Transaccion) => {
    setEditingId(trans.id);
    setFormData({
      monto: trans.monto,
      tipo: trans.tipo,
      categoria_id: categorias.find(c => c.nombre === trans.categoria)?.id || 0,
      descripcion: trans.descripcion,
      fecha: trans.fecha,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    try {
      await transaccionesService.eliminar(id);
      cargarDatos();
    } catch (err) {
      setError('Error al eliminar transacción');
    }
  };

  const resetForm = () => {
    setFormData({
      monto: 0,
      tipo: 'gasto',
      categoria_id: 0,
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading && !showForm) {
    return <div className="loading-container">Cargando transacciones...</div>;
  }

  return (
    <div className="transacciones-container">
      <div className="transacciones-header">
        <h1>Mis Transacciones</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nueva Transacción
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Editar' : 'Nueva'} Transacción</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tipo">Tipo *</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleFormChange}
                  required
                >
                  <option value="gasto">Gasto</option>
                  <option value="ingreso">Ingreso</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="monto">Monto *</label>
                <input
                  id="monto"
                  type="number"
                  name="monto"
                  value={formData.monto || ''}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="categoria_id">Categoría *</label>
                <select
                  id="categoria_id"
                  name="categoria_id"
                  value={formData.categoria_id || ''}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icono} {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fecha">Fecha</label>
                <input
                  id="fecha"
                  type="date"
                  name="fecha"
                  value={formData.fecha || ''}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion || ''}
                  onChange={handleFormChange}
                  placeholder="Detalles de la transacción..."
                  rows={3}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Transacción
              </button>
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-card">
        <h3>Filtros</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="filter-tipo">Tipo</label>
            <select
              id="filter-tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
            >
              <option value="">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="gasto">Gastos</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-categoria">Categoría</label>
            <select
              id="filter-categoria"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono} {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-fecha-inicio">Desde</label>
            <input
              id="filter-fecha-inicio"
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="filter-fecha-fin">Hasta</label>
            <input
              id="filter-fecha-fin"
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-sm" onClick={aplicarFiltros}>
            Aplicar
          </button>
          <button className="btn btn-outline btn-sm" onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>
      </div>

      {transacciones.length === 0 ? (
        <div className="empty-state">
          <p>No hay transacciones. ¡Crea una para empezar!</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="transacciones-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.map((trans) => (
                <tr key={trans.id}>
                  <td>
                    <span className="category-badge" style={{ backgroundColor: trans.color + '20', color: trans.color }}>
                      {trans.icono} {trans.categoria}
                    </span>
                  </td>
                  <td>{trans.descripcion || '-'}</td>
                  <td>
                    <span className={`type-badge ${trans.tipo}`}>
                      {trans.tipo === 'ingreso' ? '↑' : '↓'} {trans.tipo}
                    </span>
                  </td>
                  <td className={`amount ${trans.tipo}`}>
                    {trans.tipo === 'ingreso' ? '+' : '-'}${trans.monto.toFixed(2)}
                  </td>
                  <td>{trans.fecha}</td>
                  <td className="actions">
                    <button
                      className="btn-icon edit"
                      onClick={() => handleEdit(trans)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(trans.id)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = `
  .transacciones-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .transacciones-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .transacciones-header h1 {
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

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-group label {
    font-weight: 500;
    color: var(--text-dark);
    font-size: 0.9rem;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    font-family: inherit;
    font-size: 1rem;
    transition: var(--transition);
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
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

  .filters-card {
    background-color: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
  }

  .filters-card h3 {
    margin: 0 0 1rem 0;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    align-items: flex-end;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-group label {
    font-weight: 500;
    font-size: 0.85rem;
    color: var(--text-dark);
  }

  .filter-group input,
  .filter-group select {
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    font-size: 0.95rem;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .table-responsive {
    overflow-x: auto;
    background-color: var(--white);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .transacciones-table {
    width: 100%;
    border-collapse: collapse;
  }

  .transacciones-table th {
    background-color: var(--light-bg);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-dark);
    font-size: 0.9rem;
  }

  .transacciones-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .transacciones-table tbody tr:hover {
    background-color: var(--light-bg);
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .type-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
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

  .actions {
    display: flex;
    gap: 0.5rem;
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

  .btn-icon.edit:hover {
    color: var(--primary-color);
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
    .transacciones-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .filters-grid {
      grid-template-columns: 1fr;
    }

    .transacciones-table th,
    .transacciones-table td {
      padding: 0.75rem;
      font-size: 0.9rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
`;
