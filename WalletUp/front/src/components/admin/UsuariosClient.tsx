import { useState, useEffect } from 'react';

interface Usuario {
  id: number;
  username: string;
  email: string;
  rol: string;
  activo: number;
  fecha_creacion: string;
}

export default function UsuariosClient() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/admin/usuarios', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Error al cargar usuarios');
      const data = await response.json();
      setUsuarios(data);
    } catch (err) {
      setError('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.username || !formData.email || !formData.password) {
        setError('Completa todos los campos');
        return;
      }

      const response = await fetch('http://localhost:5000/admin/usuarios/crear', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData),
      });

      if (!response.ok) throw new Error('Error al crear usuario');

      setFormData({ username: '', email: '', password: '' });
      setShowForm(false);
      cargarUsuarios();
    } catch (err) {
      setError('Error al crear usuario');
      console.error(err);
    }
  };

  const handleDesactivar = async (id: number) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    try {
      const response = await fetch(`http://localhost:5000/admin/usuarios/${id}/desactivar`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Error al desactivar');
      cargarUsuarios();
    } catch (err) {
      setError('Error al desactivar usuario');
    }
  };

  if (loading) {
    return <div className="loading-container">Cargando usuarios...</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Gestión de Usuarios</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Crear Usuario
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h2>Crear Nuevo Usuario</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña *</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Crear Usuario
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.username}</strong></td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge role-${user.rol}`}>
                    {user.rol === 'superadmin' ? 'Super Admin' : 'Cliente'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.activo ? 'active' : 'inactive'}`}>
                    {user.activo ? '✓ Activo' : '✗ Inactivo'}
                  </span>
                </td>
                <td>{new Date(user.fecha_creacion).toLocaleDateString('es-ES')}</td>
                <td>
                  {user.activo && user.rol !== 'superadmin' && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDesactivar(user.id)}
                    >
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = `
  .admin-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .admin-header h1 {
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

  .table-responsive {
    overflow-x: auto;
    background-color: var(--white);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }

  .admin-table {
    width: 100%;
    border-collapse: collapse;
  }

  .admin-table th {
    background-color: var(--light-bg);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--text-dark);
  }

  .admin-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .admin-table tbody tr:hover {
    background-color: var(--light-bg);
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .badge.role-superadmin {
    background-color: #ffe0b2;
    color: #e65100;
  }

  .badge.role-cliente {
    background-color: #bbdefb;
    color: #1565c0;
  }

  .badge.active {
    background-color: #d4edda;
    color: #155724;
  }

  .badge.inactive {
    background-color: #f8d7da;
    color: #721c24;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .btn-danger {
    background-color: var(--danger-color);
    color: var(--white);
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: var(--transition);
  }

  .btn-danger:hover {
    opacity: 0.9;
  }

  .loading-container {
    text-align: center;
    padding: 2rem;
    color: var(--text-light);
  }

  @media (max-width: 768px) {
    .admin-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .admin-table th,
    .admin-table td {
      padding: 0.75rem;
      font-size: 0.9rem;
    }
  }
`;
