import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = "http://192.168.1.16:8000";

export const WS_BASE_URL = BASE_URL
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export const fetchWithAuth = async (
  url,
  options = {}
) => {

  try {

    const token =
      await AsyncStorage.getItem(
        "userToken"
      );

    console.log(
      "JWT TOKEN EXISTS:",
      !!token
    );

    console.log(
      "JWT TOKEN:",
      token
    );

    const headers = {
      ...(options.headers || {}),
    };

    if (token) {

      headers["Authorization"] =
        `Bearer ${token}`;

    }

    const config = {
      ...options,
      headers,
    };

    console.log(
      "REQUEST HEADERS:",
      headers
    );

    const response =
      await fetch(url, config);

    console.log(
      "RESPONSE STATUS:",
      response.status
    );

    return response;

  } catch (error) {

    console.log(
      "fetchWithAuth ERROR:",
      error
    );

    throw error;
  }
};

export default BASE_URL;
