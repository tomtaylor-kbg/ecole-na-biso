type ClassSection = 'A' | 'B' | 'C' | 'D' | 'UNIQUE';
type ClassOrientation = 
  | 'SCIENTIFIQUE' | 'MECANIQUE' | 'CYCLE_DE_BASE'
  | 'LITTERAIRE' | 'COMMERCIALE' | 'TECHNIQUE' | 'GENERALE';
type ClassStatus = 'ACTIVE' | 'ARCHIVED' | 'INACTIVE';

const orientationLabels: Record<ClassOrientation, string> = {
  SCIENTIFIQUE: 'Scientifique',
  MECANIQUE: 'Mécanique',
  CYCLE_DE_BASE: 'Cycle de base',
  LITTERAIRE: 'Littéraire',
  COMMERCIALE: 'Commerciale',
  TECHNIQUE: 'Technique',
  GENERALE: 'Générale',
};

const sectionLabels: Record<ClassSection, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  UNIQUE: '',
};

const statusLabels: Record<ClassStatus, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archivée',
  INACTIVE: 'Inactive',
};

export function classOrientationLabel(orientation?: ClassOrientation | null) {
  return orientation ? orientationLabels[orientation] : '';
}

export function classSectionLabel(section?: ClassSection | null) {
  return section ? sectionLabels[section] : '';
}

export function classStatusLabel(status?: ClassStatus | null) {
  return status ? statusLabels[status] : '';
}

export function classLabel(schoolClass: {
  name: string;
  code?: string;
  orientation?: ClassOrientation | string | null;
  section?: ClassSection | string | null;
}) {
  const parts = [schoolClass.name];
  
  if (schoolClass.code) {
    parts.unshift(schoolClass.code);
  }
  
  if (schoolClass.section && schoolClass.section !== 'UNIQUE') {
    parts.push(classSectionLabel(schoolClass.section as ClassSection));
  }
  
  if (schoolClass.orientation) {
    const orientation = schoolClass.orientation as ClassOrientation;
    if (orientation in orientationLabels) {
      parts.push(orientationLabels[orientation]);
    }
  }
  
  return parts.join(' · ');
}
