import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header/Header';

const MainLayout = () => {
  return (
    <>
    {/* Full header variant */}
      <Header variant="full" />
      <main>
        <Outlet />
      </main>
      {/* Footer here */}
    </>
  );
};

export default MainLayout;