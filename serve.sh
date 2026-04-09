#!/bin/bash
#SBATCH -J evopool-demo
#SBATCH -A hw-grp
#SBATCH -p preempt
#SBATCH -o /nfs/hpc/share/zhanyaol/evopool-demo/serve.log
#SBATCH -e /nfs/hpc/share/zhanyaol/evopool-demo/serve.err
#SBATCH -c 4
#SBATCH --mem=8G
#SBATCH --time=2:00:00

module load nodejs/v20.9

cd /nfs/hpc/share/zhanyaol/evopool-demo

echo "Node version: $(node --version)"
echo "=== Building on $(hostname) ==="
npx vite build 2>&1

echo "=== Starting server on $(hostname) ==="

if [ -d dist ]; then
  echo ">>> http://$(hostname):3000"
  npx vite preview --host 0.0.0.0 --port 3000
else
  echo ">>> http://$(hostname):3000 (dev mode)"
  npx vite --host 0.0.0.0 --port 3000
fi
