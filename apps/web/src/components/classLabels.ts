import type { ClassOrientation, ClassSection, ClassStatus } from './types';

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
  orientation?: ClassOrientation | null;
  section?: ClassSection | null;
}) {
  const parts = [schoolClass.name];
  
  if (schoolClass.code) {
    parts.unshift(schoolClass.code);
  }
  
  if (schoolClass.section && schoolClass.section !== 'UNIQUE') {
    parts.push(classSectionLabel(schoolClass.section));
  }
  
  if (schoolClass.orientation) {
    parts.push(classOrientationLabel(schoolClass.orientation));
  }
  
  return parts.join(' · ');
}

export function fullClassLabel(schoolClass: {
  name: string;
  code: string;
  section: ClassSection;
  orientation?: ClassOrientation | null;
  level?: { name: string };
}) {
  const parts = [
    schoolClass.code,
    schoolClass.name,
  ];
  
  if (schoolClass.section !== 'UNIQUE') {
    parts.push(classSectionLabel(schoolClass.section));
  }
  
  if (schoolClass.orientation) {
    parts.push(classOrientationLabel(schoolClass.orientation));
  }
  
  if (schoolClass.level) {
    parts.push(`(${schoolClass.level.name})`);
  }
  
  return parts.join(' ');
}
