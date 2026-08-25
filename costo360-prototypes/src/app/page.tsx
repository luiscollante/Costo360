import PrototypeSwitcher from '@/components/PrototypeSwitcher';
import VariantA from '@/components/VariantA';
import VariantB from '@/components/VariantB';
import VariantC from '@/components/VariantC';

// Para Next.js 15+, searchParams es una promesa
export default async function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const variant = (typeof searchParams?.variant === 'string' ? searchParams.variant : 'A') || 'A';

  return (
    <>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher 
        variants={['A', 'B', 'C']} 
        current={variant} 
        names={{
          A: 'Dashboard Analítico',
          B: 'Terminal de Comandos',
          C: 'Copiloto Interactivo'
        }}
      />
    </>
  );
}
