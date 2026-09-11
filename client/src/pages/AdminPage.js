import React from 'react';

const AdminPage = () => {
  return (
    <div className="min-h-screen bg-nox-black py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-black text-nox-white mb-6 text-center">
          ⚙️ Administration
        </h1>
        <p className="text-xl text-nox-white/70 text-center">
          Accès réservé aux administrateurs !
        </p>
      </div>
    </div>
  );
};

export default AdminPage;
