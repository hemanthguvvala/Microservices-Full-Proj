const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 9000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API: Get project file tree
app.get('/api/filetree', (req, res) => {
  const basePath = path.join(__dirname, '..');
  const tree = buildFileTree(basePath, '', 0, 3);
  res.json(tree);
});

// API: Read file content
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });

  const fullPath = path.join(__dirname, '..', filePath);
  if (!fullPath.startsWith(path.join(__dirname, '..'))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const ext = path.extname(filePath).slice(1);
    res.json({ path: filePath, content, extension: ext, size: content.length });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// API: Get service class list
app.get('/api/classes/:service', (req, res) => {
  const serviceMap = {
    'employee': 'employee-microservice/src/main/java/com/example/employee',
    'payroll': 'payroll-microservice/src/main/java/com/example/payroll',
    'notification': 'notification-microservice/src/main/java/com/example/notification',
    'gateway': 'api-gateway-service/src/main/java/com/example/gateway',
    'eureka': 'eureka-discovery-server/src/main/java/com/example/eureka',
    'config': 'config-server/src/main/java/com/example/config',
  };

  const servicePath = serviceMap[req.params.service];
  if (!servicePath) return res.status(404).json({ error: 'Unknown service' });

  const fullPath = path.join(__dirname, '..', servicePath);
  try {
    const classes = getJavaFiles(fullPath, servicePath);
    res.json({ service: req.params.service, classes });
  } catch (err) {
    res.json({ service: req.params.service, classes: [] });
  }
});

function getJavaFiles(dir, basePath) {
  const results = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullItemPath = path.join(dir, item.name);
      const relPath = path.join(basePath, item.name);
      if (item.isDirectory()) {
        results.push(...getJavaFiles(fullItemPath, relPath));
      } else if (item.name.endsWith('.java')) {
        results.push({
          name: item.name,
          path: relPath,
          package: relPath.replace(/\//g, '.').replace('.java', '').replace(/.*com\.example\./, 'com.example.')
        });
      }
    }
  } catch (e) { /* ignore */ }
  return results;
}

function buildFileTree(basePath, relativePath, depth, maxDepth) {
  if (depth > maxDepth) return null;
  const fullPath = path.join(basePath, relativePath);
  const skipDirs = ['node_modules', '.git', 'target', 'dist', '.angular', '.vscode', '.idea', '__pycache__'];

  try {
    const stat = fs.statSync(fullPath);
    const name = path.basename(fullPath) || 'root';

    if (stat.isDirectory()) {
      if (skipDirs.includes(name)) return null;
      const children = fs.readdirSync(fullPath)
        .map(child => buildFileTree(basePath, path.join(relativePath, child), depth + 1, maxDepth))
        .filter(Boolean)
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'directory' ? -1 : 1;
        });
      return { name, type: 'directory', path: relativePath, children };
    } else {
      return { name, type: 'file', path: relativePath, size: stat.size };
    }
  } catch (e) {
    return null;
  }
}

app.listen(PORT, () => {
  console.log(`\n🏗️  Architecture UML Server running at http://localhost:${PORT}\n`);
  console.log('  Views:');
  console.log('  • System Architecture  - Interactive microservice topology');
  console.log('  • Service Deep Dive    - Click any service for full details');
  console.log('  • Design Patterns      - 34+ patterns with implementations');
  console.log('  • Data Flow            - Request/event sequence diagrams');
  console.log('  • Infrastructure       - Docker / K8s / Helm / Terraform');
  console.log('  • Technology Stack     - Categorized tech radar');
  console.log('  • Project Structure    - Interactive file explorer\n');
});
