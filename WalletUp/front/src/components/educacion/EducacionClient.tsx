import { useState, useEffect } from 'react';
import { educacionService } from '../../services/educacion';
import type { Modulo, ModuloDetalle } from '../../types';

export default function EducacionClient() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [moduloSeleccionado, setModuloSeleccionado] = useState<ModuloDetalle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarModulos();
  }, []);

  const cargarModulos = async () => {
    try {
      setLoading(true);
      setError(null);
      const mods = await educacionService.listar();
      setModulos(mods);
    } catch (err) {
      setError('Error al cargar módulos educativos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerModulo = async (id: number) => {
    try {
      setLoading(true);
      const mod = await educacionService.obtener(id);
      setModuloSeleccionado(mod);
    } catch (err) {
      setError('Error al cargar módulo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !moduloSeleccionado) {
    return <div className="loading-container">Cargando módulos educativos...</div>;
  }

  if (moduloSeleccionado) {
    return (
      <div className="educacion-detalle">
        <button
          className="btn btn-outline btn-back"
          onClick={() => setModuloSeleccionado(null)}
        >
          ← Volver
        </button>

        <article className="modulo-contenido">
          <h1>{moduloSeleccionado.titulo}</h1>
          <p className="modulo-descripcion">{moduloSeleccionado.descripcion}</p>

          <div
            className="modulo-html"
            dangerouslySetInnerHTML={{ __html: moduloSeleccionado.contenido }}
          />
        </article>
      </div>
    );
  }

  return (
    <div className="educacion-container">
      <div className="educacion-header">
        <h1>Centro Educativo</h1>
        <p className="subtitle">Aprende sobre educación financiera y mejora tus habilidades</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {modulos.length === 0 ? (
        <div className="empty-state">
          <p>No hay módulos disponibles en este momento</p>
        </div>
      ) : (
        <div className="modulos-grid">
          {modulos.map((modulo, idx) => (
            <div key={modulo.id} className="modulo-card">
              <div className="modulo-icon">
                {getIconoModulo(idx)}
              </div>

              <h3>{modulo.titulo}</h3>
              <p className="modulo-desc-short">{modulo.descripcion}</p>

              <button
                className="btn btn-primary"
                onClick={() => handleVerModulo(modulo.id)}
              >
                Leer Módulo
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="educacion-info">
        <h2>¿Por qué educación financiera?</h2>
        <div className="benefits-grid">
          <div className="benefit-item">
            <span className="benefit-icon">💡</span>
            <h4>Tomar mejores decisiones</h4>
            <p>Comprende cómo tus gastos afectan tu futuro financiero</p>
          </div>

          <div className="benefit-item">
            <span className="benefit-icon">🎯</span>
            <h4>Alcanza tus metas</h4>
            <p>Aprende técnicas para ahorrar y lograr objetivos financieros</p>
          </div>

          <div className="benefit-item">
            <span className="benefit-icon">📈</span>
            <h4>Crece económicamente</h4>
            <p>Descubre estrategias para hacer crecer tu patrimonio</p>
          </div>

          <div className="benefit-item">
            <span className="benefit-icon">🛡️</span>
            <h4>Protege tu futuro</h4>
            <p>Conoce sobre inversiones y planificación para la jubilación</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getIconoModulo(idx: number): string {
  const iconos = ['📚', '💰', '📊', '🎓', '💳', '📈', '🏦', '💵'];
  return iconos[idx % iconos.length];
}

const styles = `
  .educacion-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .educacion-header {
    text-align: center;
    margin-bottom: 1rem;
  }

  .educacion-header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
  }

  .subtitle {
    color: var(--text-light);
    margin: 0;
    font-size: 1.1rem;
  }

  .modulos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .modulo-card {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
    transition: var(--transition);
  }

  .modulo-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
  }

  .modulo-icon {
    font-size: 3rem;
  }

  .modulo-card h3 {
    margin: 0;
    color: var(--text-dark);
    font-size: 1.1rem;
  }

  .modulo-desc-short {
    margin: 0;
    color: var(--text-light);
    font-size: 0.9rem;
    line-height: 1.4;
    flex-grow: 1;
  }

  .modulo-card .btn {
    width: 100%;
  }

  .educacion-detalle {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .btn-back {
    align-self: flex-start;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  .modulo-contenido {
    background: var(--white);
    border-radius: var(--radius);
    padding: 2rem;
    box-shadow: var(--shadow);
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  .modulo-contenido h1 {
    margin: 0 0 0.5rem 0;
    color: var(--text-dark);
  }

  .modulo-descripcion {
    color: var(--text-light);
    margin: 0 0 1.5rem 0;
    font-size: 1.1rem;
    font-style: italic;
  }

  .modulo-html {
    color: var(--text-dark);
    line-height: 1.8;
  }

  .modulo-html h2 {
    margin: 1.5rem 0 1rem 0;
    color: var(--primary-color);
    border-bottom: 2px solid var(--light-bg);
    padding-bottom: 0.5rem;
  }

  .modulo-html h3 {
    margin: 1.25rem 0 0.75rem 0;
    color: var(--text-dark);
  }

  .modulo-html p {
    margin: 0.75rem 0;
  }

  .modulo-html ul,
  .modulo-html ol {
    margin: 1rem 0;
    padding-left: 2rem;
  }

  .modulo-html li {
    margin: 0.5rem 0;
  }

  .modulo-html strong {
    color: var(--primary-color);
    font-weight: 600;
  }

  .educacion-info {
    background: var(--light-bg);
    border-radius: var(--radius);
    padding: 2rem;
    margin-top: 1rem;
  }

  .educacion-info h2 {
    margin: 0 0 1.5rem 0;
    text-align: center;
    color: var(--text-dark);
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .benefit-item {
    background: var(--white);
    border-radius: var(--radius);
    padding: 1.5rem;
    text-align: center;
    box-shadow: var(--shadow);
  }

  .benefit-icon {
    display: block;
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }

  .benefit-item h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-dark);
  }

  .benefit-item p {
    margin: 0;
    color: var(--text-light);
    font-size: 0.9rem;
    line-height: 1.4;
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
    .educacion-header h1 {
      font-size: 1.5rem;
    }

    .modulos-grid {
      grid-template-columns: 1fr;
    }

    .modulo-contenido {
      padding: 1.5rem;
    }

    .benefits-grid {
      grid-template-columns: 1fr;
    }
  }
`;
