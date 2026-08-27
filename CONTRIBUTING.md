# Contributing to LAN Saturn

Thank you for helping improve LAN Saturn! We welcome contributions to peer discovery, local transport protocols, security, and user experience.

---

## 1. Development Workflow

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lan-saturn.git
   cd lan-saturn
   ```

2. **Environment Setup**:
   ```bash
   pip install -r requirements.txt
   npm install
   ```

3. **Running the App**:
   ```bash
   npm run dev
   ```

4. **Testing**:
   Run the full pytest suite before submitting pull requests:
   ```bash
   python -m pytest -v tests/
   ```

---

## 2. Coding & Architectural Principles

- **No Over-Engineering**: Prefer simple, maintainable solutions over complex abstractions.
- **Accurate Claims**: Do not claim performance numbers or transport features unless verified by codebase implementation and benchmark harnesses.
- **Security First**: Input validation is mandatory on all network boundaries. Never expose secrets or private keys over unauthenticated channels.
- **Preserve Test Coverage**: All existing unit and security regression tests must pass.

---

## 3. Pull Request Guidelines

- Ensure `python -m pytest -v tests/` passes 100%.
- Keep PRs focused on single tasks or milestone steps.
- Include clear descriptions and benchmark results if modifying transport layers.
