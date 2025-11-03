// 📐 USE GRID DENSITY - Hook per densità griglia personalizzabile
import { useLocalStorage } from './useLocalStorage';

export const useGridDensity = () => {
  const [density, setDensity] = useLocalStorage('gridDensity', 'normal');
  
  const configs = {
    compact: {
      columns: { base: 3, sm: 4, md: 5, lg: 7, xl: 8 },
      spacing: 2,
      cardHeight: '220px'
    },
    normal: {
      columns: { base: 2, sm: 3, md: 4, lg: 5, xl: 6 },
      spacing: 4,
      cardHeight: '280px'
    },
    comfortable: {
      columns: { base: 2, sm: 2, md: 3, lg: 4, xl: 5 },
      spacing: 6,
      cardHeight: '320px'
    }
  };
  
  return {
    density,
    setDensity,
    config: configs[density] || configs.normal,
    densityOptions: [
      { value: 'compact', label: '🔹 Compatto', description: 'Più manga visibili' },
      { value: 'normal', label: '🔸 Normale', description: 'Bilanciato' },
      { value: 'comfortable', label: '🔶 Comodo', description: 'Più spazio' }
    ]
  };
};

export default useGridDensity;

