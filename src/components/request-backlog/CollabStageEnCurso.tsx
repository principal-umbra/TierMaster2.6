import React from 'react';

export const CollabStageEnCurso = ({ requests, setSelectedRequest }) => {
  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} onClick={() => setSelectedRequest(req)} className="p-4 border rounded cursor-pointer hover:bg-slate-50">
          <div className="font-bold">{req.id}</div>
          <div className="text-sm">{req.subject}</div>
        </div>
      ))}
    </div>
  );
};
