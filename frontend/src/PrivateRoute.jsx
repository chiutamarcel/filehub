import React from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from "js-cookie";

const PrivateRoute = ({ Component }) => {
  const authenticate = Cookies.get('jwt') ? true : false;

  console.log("authenticate: " + authenticate);

  return authenticate ? (<Component/>) : (<Navigate to={`/login`} />);
};

export default PrivateRoute;