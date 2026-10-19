// Onay penceresi (yeniden başlatma, çıkış, veri sıfırlama). Yerel <dialog> kullanır: odak tuzağı ve Esc hazır gelir.

export function confirmDialog({ title = 'Emin misin?', message, confirmText = 'Evet', cancelText = 'Vazgeç', danger = false }) {
    const dialog = document.getElementById('confirm-dialog');
    dialog.querySelector('#confirm-title').textContent = title;
    dialog.querySelector('#confirm-message').textContent = message;
    const ok = dialog.querySelector('#confirm-ok');
    ok.textContent = confirmText;
    ok.classList.toggle('btn-danger', danger);
    dialog.querySelector('#confirm-cancel').textContent = cancelText;
    dialog.returnValue = '';
    return new Promise(resolve => {
        dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
        dialog.showModal();
        dialog.querySelector('#confirm-cancel').focus();
    });
}

export const isDialogOpen = () => !!document.querySelector('dialog[open]');
