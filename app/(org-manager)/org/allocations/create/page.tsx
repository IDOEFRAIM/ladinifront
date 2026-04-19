import AllocationForm from '@/components/AllocationForm';

export default async function Page() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Create Allocation</h1>
      <AllocationForm />
    </div>
  );
}
