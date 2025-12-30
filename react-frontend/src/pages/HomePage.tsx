import { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import { getWallpaper, Wallpaper } from '../services/api'; // Import the updated service

const HomePage = () => {
  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getWallpaper();
        setWallpaper(data);
      } catch (err) {
        setError('Failed to fetch wallpaper.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <PageLayout>
      <div
        className="relative h-96 rounded-lg bg-cover bg-center flex items-center justify-center text-center p-4"
        style={{ backgroundImage: `url(${wallpaper?.url})` }}
      >
        <div className="absolute inset-0 bg-black opacity-50 rounded-lg"></div>
        <div className="relative z-10">
          {loading && <p className="text-gray-200 text-lg">Loading background...</p>}
          {error && <p className="text-red-400 text-lg">{error}</p>}
          {wallpaper && (
            <>
              <h1 className="text-4xl font-bold text-white">{wallpaper.title}</h1>
              <p className="text-sm text-gray-300 mt-2">{wallpaper.copyright}</p>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default HomePage;
