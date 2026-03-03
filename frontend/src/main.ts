const selectElement = document.getElementById('platform-select') as HTMLSelectElement | null;

if (!selectElement) {
  throw new Error('Missing #platform-select element');
}

const dropdown = selectElement;

type PlatformRow = {
  id?: number | string;
  name?: string;
  title?: string;
  platform?: string;
  [key: string]: unknown;
};

function toOptionLabel(platform: PlatformRow, index: number): string {
  if (typeof platform.name === 'string' && platform.name.length > 0) return platform.name;
  if (typeof platform.title === 'string' && platform.title.length > 0) return platform.title;
  if (typeof platform.platform === 'string' && platform.platform.length > 0) return platform.platform;
  if (platform.id !== undefined) return `Platform ${platform.id}`;
  return `Platform ${index + 1}`;
}

async function loadPlatforms(): Promise<void> {
  try {
    const response = await fetch('/api/platforms');

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const platforms = (await response.json()) as PlatformRow[];

    dropdown.innerHTML = '';

    if (!Array.isArray(platforms) || platforms.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No platforms found';
      option.value = '';
      dropdown.appendChild(option);
      return;
    }

    platforms.forEach((platform, index) => {
      const option = document.createElement('option');
      option.value = platform.id !== undefined ? String(platform.id) : String(index + 1);
      option.textContent = toOptionLabel(platform, index);
      dropdown.appendChild(option);
    });
  } catch (error) {
    dropdown.innerHTML = '';
    const option = document.createElement('option');
    option.textContent = 'Error loading platforms';
    option.value = '';
    dropdown.appendChild(option);
    console.error(error);
  }
}

loadPlatforms();
