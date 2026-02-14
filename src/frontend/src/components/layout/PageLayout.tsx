import { ReactNode } from 'react';

interface PageProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl';
}

export function Page({ children, maxWidth = '6xl' }: PageProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
  };

  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6`}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}

export function PageHeader({ icon, title, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-3xl font-bold">{title}</h2>
      </div>
      {action}
    </div>
  );
}
