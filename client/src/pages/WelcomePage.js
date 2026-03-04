import React, {useState, useEffect} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {api} from '../api/config';
import {API_BASE_URL} from '../api/config';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedTab, setFeedTab] = useState('all');
  


}



  