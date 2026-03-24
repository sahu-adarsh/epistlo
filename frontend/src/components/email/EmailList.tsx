import React from 'react';
import {
  List,
  ListItem,
  IconButton,
  Typography,
  Box,
  Checkbox,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  MarkEmailUnread as MarkUnreadIcon,
  AttachFile as AttachmentIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Email } from '../../types/email';

interface EmailListProps {
  emails: Email[];
  selectedEmails: string[];
  onEmailSelect: (emailId: string, selected: boolean) => void;
  onEmailClick: (email: Email) => void;
  onReplyToEmail?: (email: Email) => void;
  onStarToggle: (emailId: string) => void;
  onDeleteEmail: (emailId: string) => void;
  onMarkAsRead: (emailId: string, isRead: boolean) => void;
  loading?: boolean;
}

const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmails,
  onEmailSelect,
  onEmailClick,
  onReplyToEmail,
  onStarToggle,
  onDeleteEmail,
  onMarkAsRead,
  loading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatEmailAddress = (address: { email: string; name?: string }) => {
    return address.name || address.email;
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffInHours < 24) return format(date, 'h:mm');
    return format(date, 'd MMM');
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading emails...</Typography>
      </Box>
    );
  }

  if (emails.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No emails found
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ width: '100%', bgcolor: 'transparent', py: 0 }}>
      {emails.map((email) => (
        <React.Fragment key={email.id}>
          <ListItem
            sx={{
              backgroundColor: email.is_read ? 'rgba(0, 0, 0, 0.2)' : 'rgba(100, 181, 246, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.1), inset -1px 0 0 rgba(255,255,255,0.1), 0 1px 2px 0 rgba(0,0,0,0.3)',
              },
              cursor: 'pointer',
              px: 0, py: 0,
              minHeight: isMobile ? 64 : 40,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              alignItems: isMobile ? 'flex-start' : 'center',
            }}
            onClick={() => onEmailClick(email)}
          >
            {/* Checkbox — hidden on mobile */}
            {!isMobile && (
              <Box sx={{ px: 1.9, display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={selectedEmails.includes(email.id)}
                  onChange={(e) => { e.stopPropagation(); onEmailSelect(email.id, e.target.checked); }}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: '#64b5f6' } }}
                />
              </Box>
            )}

            {/* Star */}
            <Box sx={{ px: isMobile ? 0.5 : 1, pt: isMobile ? 1.2 : 0, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center' }}>
              <IconButton
                onClick={(e) => { e.stopPropagation(); onStarToggle(email.id); }}
                size="small"
                sx={{
                  color: email.is_starred ? '#f4b400' : 'rgba(255,255,255,0.6)',
                  minWidth: 44, minHeight: 44,
                  '&:hover': { color: email.is_starred ? '#f4b400' : '#64b5f6' },
                }}
              >
                {email.is_starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Box>

            {/* Content */}
            {isMobile ? (
              // ── Mobile: 2-line compact layout ──
              <Box sx={{ flexGrow: 1, py: 1, pr: 0.5, minWidth: 0 }}>
                {/* Line 1: Sender + date */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: email.is_read ? 400 : 700,
                      color: email.is_read ? 'rgba(255,255,255,0.7)' : '#ffffff',
                      fontSize: '13px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '65%',
                    }}
                  >
                    {formatEmailAddress(email.from_address)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: email.is_read ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)',
                      fontSize: '11px',
                      fontWeight: email.is_read ? 400 : 600,
                      flexShrink: 0, ml: 1,
                    }}
                  >
                    {formatDate(email.created_at)}
                  </Typography>
                </Box>
                {/* Line 2: Subject */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: email.is_read ? 400 : 600,
                    color: email.is_read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.88)',
                    fontSize: '12px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {email.status === 'draft' && (
                    <span style={{ color: '#FA8072', fontWeight: 600, marginRight: 4 }}>Draft</span>
                  )}
                  {email.subject}
                  {email.attachments.length > 0 && (
                    <AttachmentIcon sx={{ fontSize: 12, ml: 0.5, verticalAlign: 'middle', opacity: 0.6 }} />
                  )}
                </Typography>
              </Box>
            ) : (
              // ── Desktop: single-line Gmail-style ──
              <Box sx={{ flexGrow: 1, py: 1, px: 1, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: email.is_read ? 400 : 600,
                          color: email.is_read ? 'rgba(255,255,255,0.7)' : '#ffffff',
                          fontSize: '14px', mr: 2, flexShrink: 0,
                        }}
                      >
                        {formatEmailAddress(email.from_address)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: email.is_read ? 400 : 600,
                          color: email.is_read ? 'rgba(255,255,255,0.7)' : '#ffffff',
                          fontSize: '14px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flexGrow: 1,
                        }}
                      >
                        {email.status === 'draft' && (
                          <span style={{ color: '#FA8072', fontWeight: 600, marginRight: '4px' }}>Draft</span>
                        )}
                        {email.subject} -{' '}
                        <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>
                          {truncateText(email.body, 50)}
                        </span>
                        {email.attachments.length > 0 && (
                          <AttachmentIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', ml: 0.5, verticalAlign: 'middle' }} />
                        )}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: email.is_read ? 'rgba(255,255,255,0.6)' : '#ffffff',
                        fontSize: '14px',
                        fontWeight: email.is_read ? 400 : 600,
                        minWidth: 'fit-content', ml: 2,
                      }}
                    >
                      {formatDate(email.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Desktop: hover action buttons */}
            {!isMobile && (
              <Box sx={{
                display: 'flex', gap: 0.5,
                opacity: 0,
                '&:hover': { opacity: 1 },
                transition: 'opacity 0.2s ease-in-out',
                px: 1,
              }}>
                {onReplyToEmail && (
                  <Tooltip title="Reply">
                    <IconButton onClick={(e) => { e.stopPropagation(); onReplyToEmail(email); }} size="small" sx={{ color: 'rgba(255,255,255,0.6)', minWidth: 36, minHeight: 36 }}>
                      <ReplyIcon />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title={email.is_read ? 'Mark as unread' : 'Mark as read'}>
                  <IconButton onClick={(e) => { e.stopPropagation(); onMarkAsRead(email.id, !email.is_read); }} size="small" sx={{ color: 'rgba(255,255,255,0.6)', minWidth: 36, minHeight: 36 }}>
                    {email.is_read ? <MarkUnreadIcon /> : <MarkReadIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton onClick={(e) => { e.stopPropagation(); onDeleteEmail(email.id); }} size="small" sx={{ color: 'rgba(255,255,255,0.6)', minWidth: 36, minHeight: 36 }}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {/* Mobile: always-visible delete button */}
            {isMobile && (
              <Box sx={{ pr: 0.5, pt: 1.2, display: 'flex', alignItems: 'flex-start' }}>
                <IconButton
                  onClick={(e) => { e.stopPropagation(); onDeleteEmail(email.id); }}
                  size="small"
                  sx={{ color: 'rgba(255,255,255,0.35)', minWidth: 44, minHeight: 44 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
};

export default EmailList;
