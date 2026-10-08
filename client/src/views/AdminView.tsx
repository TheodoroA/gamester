import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Upload, Play, Pause, Check, AlertCircle, Lock, LogOut } from 'lucide-react';
import { YouTubeHeadlessPlayer } from '../components/YouTubeHeadlessPlayer.js';

interface AdminViewProps {
  onBack: () => void;
}

interface SongItem {
  id: string;
  gameTitle: string;
  releaseYear: number;
  songTitle: string;
  youtubeUrl: string;
  youtubeId: string;
  startTime: number;
  platform?: string;
  category?: string;
  tags: string[];
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('gamester_admin_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'IMPORT'>('LIST');

  // Form states
  const [gameTitle, setGameTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [songTitle, setSongTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [platform, setPlatform] = useState('');
  const [category, setCategory] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [aliasesStr, setAliasesStr] = useState('');

  // Audio preview
  const [previewing, setPreviewing] = useState(false);
  const [previewId, setPreviewId] = useState('');
  const [previewStart, setPreviewStart] = useState(0);

  // Import state
  const [importJson, setImportJson] = useState('');
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSongs = async (key = adminKey) => {
    const trimmed = key.trim();
    if (!trimmed) {
      setIsAuthenticated(false);
      return false;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/catalog/songs?limit=100', {
        headers: { 'x-admin-key': trimmed }
      });

      if (res.ok) {
        const data = await res.json();
        setSongs(data.songs || []);
        setIsAuthenticated(true);
        setAuthError(null);
        localStorage.setItem('gamester_admin_key', trimmed);
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        setIsAuthenticated(false);
        setSongs([]);
        setAuthError(data.error?.message || 'Chave de administração incorreta.');
        localStorage.removeItem('gamester_admin_key');
        return false;
      }
    } catch (e) {
      console.error(e);
      setIsAuthenticated(false);
      setAuthError('Erro ao conectar ao servidor para validar a chave.');
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchSongs(adminKey);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setAuthError('Digite a chave secreta de administração.');
      return;
    }
    fetchSongs(adminKey.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('gamester_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
    setSongs([]);
    setPreviewing(false);
    setPreviewId('');
    setAuthError(null);
  };

  const handleTestPreview = () => {
    const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
    const id = match ? match[1] : youtubeUrl.length === 11 ? youtubeUrl : '';
    if (!id) {
      alert('URL do YouTube inválida.');
      return;
    }
    setPreviewId(id);
    setPreviewStart(startTime);
    setPreviewing(true);
  };

  const toggleSongPreview = (song: SongItem) => {
    if (previewing && previewId === song.youtubeId) {
      setPreviewing(false);
    } else {
      setPreviewId(song.youtubeId);
      setPreviewStart(song.startTime || 0);
      setPreviewing(true);
    }
  };

  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const aliases = aliasesStr.split(',').map(a => a.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/catalog/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          gameTitle,
          releaseYear,
          songTitle,
          youtubeUrl,
          startTime,
          platform: platform || undefined,
          category: category || undefined,
          tags,
          aliases
        })
      });

      if (res.ok) {
        alert('Música adicionada com sucesso!');
        setGameTitle('');
        setSongTitle('');
        setYoutubeUrl('');
        setStartTime(0);
        setTagsStr('');
        setAliasesStr('');
        setPreviewing(false);
        setActiveTab('LIST');
        fetchSongs();
      } else {
        const err = await res.json();
        alert(`Erro: ${err.error?.message || 'Falha ao salvar'}`);
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  const handleImportBatch = async () => {
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        setImportMsg({ type: 'error', text: 'O JSON deve conter um array de músicas.' });
        return;
      }

      const res = await fetch('/api/catalog/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ songs: parsed })
      });

      const data = await res.json();
      if (res.ok) {
        setImportMsg({ type: 'success', text: `Sucesso! ${data.inserted} músicas importadas para o banco.` });
        setImportJson('');
        fetchSongs();
      } else {
        setImportMsg({ type: 'error', text: data.error?.message || 'Erro na importação.' });
      }
    } catch (err) {
      setImportMsg({ type: 'error', text: 'JSON malformado. Verifique a sintaxe.' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md w-full mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <h2 className="text-xl font-black text-white mb-4">Acesso Administrativo</h2>

        {authError && (
          <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs font-bold">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Chave Secreta (ADMIN_KEY)</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Digite a chave da VPS"
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-bold rounded-xl text-white text-sm transition-all flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <span>Verificando chave...</span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Acessar Catálogo</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
      {/* Player oculto para pré-escuta de 30s */}
      {previewId && (
        <YouTubeHeadlessPlayer
          youtubeId={previewId}
          startTime={previewStart}
          isPlaying={previewing}
        />
      )}

      <div className="flex justify-between items-center pb-6 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-black text-white">Administração do Catálogo</h2>
            <p className="text-xs text-slate-400">Total de músicas cadastradas: {songs.length}</p>
          </div>
        </div>

        {/* Abas e Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
              activeTab === 'LIST' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Músicas
          </button>
          <button
            onClick={() => setActiveTab('CREATE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 ${
              activeTab === 'CREATE' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 ${
              activeTab === 'IMPORT' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Importar IA
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 flex items-center gap-1 transition-colors border border-slate-700/50"
            title="Encerrar sessão de administrador"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>

      {/* ABA 1: Lista de Músicas */}
      {activeTab === 'LIST' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 text-center w-12">Prévia</th>
                <th className="p-3">Jogo</th>
                <th className="p-3">Ano</th>
                <th className="p-3">Faixa</th>
                <th className="p-3">Tags</th>
                <th className="p-3 text-right">Início</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {songs.map((s) => {
                const isPlaying = previewing && previewId === s.youtubeId;
                return (
                  <tr key={s.id} className={`hover:bg-slate-800/40 transition-colors ${isPlaying ? 'bg-purple-950/30' : ''}`}>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSongPreview(s)}
                        className={`p-2 rounded-lg transition-all ${
                          isPlaying
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                            : 'bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white'
                        }`}
                        title={isPlaying ? 'Pausar áudio' : 'Ouvir trecho de 30s'}
                      >
                        {isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span>{s.gameTitle}</span>
                        {isPlaying && (
                          <span className="text-[10px] text-amber-400 font-semibold animate-pulse">
                            ▶ Tocando
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-purple-400">{s.releaseYear}</td>
                    <td className="p-3">{s.songTitle}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {s.tags.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">{s.startTime}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ABA 2: Formulário Manual */}
      {activeTab === 'CREATE' && (
        <form onSubmit={handleCreateSong} className="space-y-4 max-w-xl mx-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Título do Jogo</label>
              <input
                type="text"
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Ano de Lançamento</label>
              <input
                type="number"
                value={releaseYear}
                onChange={(e) => setReleaseYear(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Nome da Música</label>
            <input
              type="text"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-1">Link do YouTube</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Segundo Inicial</label>
              <input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
          </div>

          {/* Testar Pré-escuta */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestPreview}
              disabled={!youtubeUrl}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 text-purple-300"
            >
              <Play className="w-3.5 h-3.5" />
              {previewing ? 'Reproduzindo Trecho de 30s...' : 'Testar Trecho (30s)'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Plataforma (Opcional)</label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="SNES, PS1, PC..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Categoria (Opcional)</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Retro, Indie, Moderno..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Tags (separadas por vírgula)</label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="rpg, snes, boss-battle"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Aliases (separados por vírgula)</label>
              <input
                type="text"
                value={aliasesStr}
                onChange={(e) => setAliasesStr(e.target.value)}
                placeholder="CT, Chrono"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all"
          >
            Salvar Música no Catálogo
          </button>
        </form>
      )}

      {/* ABA 3: Importação em Lote */}
      {activeTab === 'IMPORT' && (
        <div className="space-y-4 max-w-xl mx-auto">
          <p className="text-xs text-slate-400">
            Cole abaixo um array JSON com as faixas geradas pela IA (conforme o modelo em <code className="text-purple-400">docs/songs-seed-template.json</code>).
          </p>

          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            rows={10}
            placeholder='[ { "gameTitle": "Chrono Trigger", "releaseYear": 1995, ... } ]'
            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />

          {importMsg && (
            <div
              className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                importMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
              }`}
            >
              {importMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{importMsg.text}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleImportBatch}
            disabled={!importJson.trim()}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all"
          >
            Importar Músicas para o Banco
          </button>
        </div>
      )}
    </div>
  );
};
