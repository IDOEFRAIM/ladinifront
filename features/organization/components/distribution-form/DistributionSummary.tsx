'use client';

import type { AllocOption, ProducerOption, MemberOption } from '@/features/organization/components/distribution-form/distribution-form.types';

interface Props {
  producer: ProducerOption;
  allocation: AllocOption;
  quantity: number | '';
  assignedTo: string;
  members: MemberOption[];
}

export default function DistributionSummary({ producer: selectedProducer, allocation: selectedAllocation, quantity, assignedTo, members }: Props) {
  return (
    <div className="px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 text-sm">
      <div className="font-bold text-stone-700 mb-1">Récapitulatif</div>
      <p className="text-stone-600">
        Le producteur <strong>{selectedProducer.businessName || selectedProducer.userName}</strong> recevra{' '}
        <strong>{quantity} {selectedAllocation.unit}</strong> de <strong>{selectedAllocation.seedType}</strong>.
        {assignedTo ? (
          <> Le lot sera remis par <strong>{members.find(m => m.userId === assignedTo)?.userName || assignedTo}</strong>.</>
        ) : (
          <> Le lot sera remis par l&apos;agent connecté.</>  
        )}
      </p>
    </div>
  );
}
