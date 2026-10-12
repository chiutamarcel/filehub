import Cookies from "js-cookie";
import  { Navigate } from 'react-router-dom'

export async function fetchAuthenticated(input, init, navigate) {
    if (!input || !init || !navigate){
        throw new Error("Missing arguments in fetchAuthenticated");
    }

    var jwt = Cookies.get("jwt");

    if (!jwt) {
        navigate('/login');
    }

    if (!init.headers){
        init.headers = {
            Authorization: `Bearer ${jwt}`
        }
    }

    if (!init.headers.Authorization) {
        init.headers.Authorization = `Bearer ${jwt}`
    }

    var response = await fetch(
        input,
        init
    );

    if (response.status == 401) {
        Cookies.remove('jwt', { secure: false, sameSite: 'Strict' });
        navigate('/login');
    }

    // console.log(response.json());

    return response;
}