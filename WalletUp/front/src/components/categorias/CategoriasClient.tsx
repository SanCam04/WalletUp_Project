import { useState, useEffect } from 'react';
import { categoriasService } from '../../services/categorias';
import type { Categoria, CategoriaForm } from '../../types';

export default function CategoriasClient() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasEliminadas, setCategoriasEliminadas] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<CategoriaForm>({
    nombre: '',
    icono: '📁',
    color: '#3366cc',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const cats = await categoriasService.listar();
      setCategorias(cats.filter(c => c.activa));
      setCategoriasEliminadas(cats.filter(c => !c.activa));
    } catch (err) {
      setError('Error al cargar categorías');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.nombre) {
        setError('El nombre es requerido');
        return;
      }

      if (editingId) {
        await categoriasService.editar(editingId, formData);
      } else {
        await categoriasService.crear(formData);
      }

      resetForm();
      cargarDatos();
    } catch (err) {
      setError('Error al guardar categoría');
      console.error(err);
    }
  };

  const handleEdit = (cat: Categoria) => {
    setEditingId(cat.id);
    setFormData({
      nombre: cat.nombre,
      icono: cat.icono,
      color: cat.color,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await categoriasService.eliminar(id);
      cargarDatos();
    } catch (err) {
      setError('Error al eliminar categoría');
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await categoriasService.restaurar(id);
      cargarDatos();
    } catch (err) {
      setError('Error al restaurar categoría');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      icono: '📁',
      color: '#3366cc',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const emojis = ['🍔', '🚗', '🏠', '🎓', '💊', '🎮', '✈️', '🛍️', '💼', '🌳', '📚', '🎵', '⚽', '📱', '💄'];

  if (loading && !showForm) {
    return <div className="loading-container">Cargando categorías...</div>;
  }

  return (
    <div className="categorias-container">
      <div className="categorias-header">
        <h1>Mis Categorías</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nueva Categoría
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h2>{editingId ? 'Editar' : 'Nueva'} Categoría</h2>
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
                  placeholder="Ej: Alimentación"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Color</label>
                <input
                  id="color"
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Emoji</label>
              <div className="emoji-picker">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`emoji-btn ${formData.icono === emoji ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, icono: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Categoría
              </button>
              <button type="button" className="btn btn-outline" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="categories-grid">
        {categorias.length === 0 ? (
          <div className="empty-state">
            <p>No hay categorías. ¡Crea una para empezar!</p>
          </div>
        ) : (
          categorias.map((cat) => (
            <div key={cat.id} className="category-card" style={{ borderLeftColor: cat.color }}>
              <div className="category-emoji">{cat.icono}</div>
              <h3>{cat.nombre}</h3>
              {!cat.es_predefinida && (
                <div className="category-actions">
                  <button
                    className="btn-icon edit"
                    onClick={() => handleEdit(cat)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDelete(cat.id)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              )}
              {cat.es_predefinida && <span className="badge-predefinida">Predefinida</span>}
            </div>
          ))
        )}
      </div>

      {categoriasEliminadas.length > 0 && (
        <div className="deleted-section">
          <h2>Categorías Eliminadas</h2>
          <div className="categories-grid">
            {categoriasEliminadas.map((cat) => (
              <div key={cat.id} className="category-card deleted">
                <div className="category-emoji">{cat.icono}</div>
                <h3>{cat.nombre}</h3>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleRestore(cat.id)}
                >
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = `
  .categorias-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .categorias-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .categorias-header h1 {
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

  .emoji-picker {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
    gap: 0.5rem;
    margin: 0.5rem 0;
  }

  .emoji-btn {
    padding: 0.5rem;
    border: 2px solid var(--border-color);
    border-radius: var(--radius);
    background: var(--white);
    font-size: 1.5rem;
    cursor: pointer;
    transition: var(--transition);
  }

  .emoji-btn:hover {
    border-color: var(--primary-color);
    transform: scale(1.1);
  }

  .emoji-btn.active {
    border-color: var(--primary-color);
    background-color: var(--light-bg);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .category-card {
    background-color: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--primary-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.75rem;
    transition: var(--transition);
  }

  .category-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .category-card.deleted {
    opacity: 0.6;
    border-left-color: var(--border-color);
  }

  .category-emoji {
    font-size: 2.5rem;
  }

  .category-card h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-dark);
  }

  .category-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
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

  .badge-predefinida {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background-color: #e3f2fd;
    color: #1976d2;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .deleted-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid var(--border-color);
  }

  .deleted-section h2 {
    color: var(--text-light);
    margin-bottom: 1rem;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 2rem;
    background-color: var(--light-bg);
    border-radius: var(--radius);
    color: var(--text-light);
  }

  .loading-container {
    text-align: center;
    padding: 2rem;
    color: var(--text-light);
  }

  @media (max-width: 768px) {
    .categorias-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .categories-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
  }
`;
