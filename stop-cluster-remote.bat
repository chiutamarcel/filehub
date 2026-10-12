kubectl delete deployment --all --kubeconfig=.\kubeconfig.yml -n filehub-ns
kubectl delete service --all --kubeconfig=.\kubeconfig.yml -n filehub-ns
kubectl delete ingress --all --kubeconfig=.\kubeconfig.yml -n filehub-ns