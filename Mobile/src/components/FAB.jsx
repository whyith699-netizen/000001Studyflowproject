import React from 'react';
import { Plus } from 'lucide-react';

export default function FAB({ onClick, icon: Icon = Plus }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Add new item">
      <Icon size={26} />
    </button>
  );
}
