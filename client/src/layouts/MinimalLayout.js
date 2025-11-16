import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header/Header';

const MinimalLayout = () => {
  return (
    <>
    {/* Full header variant */}
      <Header variant="minimal" />
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default MinimalLayout;